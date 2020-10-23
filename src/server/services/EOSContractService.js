import { config, getDatabase, getCollection } from "../mongo";
import { sleep } from "@/novusphere-js/utility";

export default class EOSContractService {
    constructor(table, contract, chain, childService) {
        this.dispatch = {};
        this.updates = {};
        this.table = table;
        this.chain = chain;
        this.childService = childService;
        this.DEFAULT_STATE = {
            name: contract,
            id: 0,
            block: 0,
            time: 0
        };
    }

    async getState() {
        const db = await getDatabase();
        let state = await db.collection(config.table.state)
            .findOne({ name: `${this.chain}::${this.DEFAULT_STATE.name}` });

        if (!state) {
            state = {};
            Object.assign(state, this.DEFAULT_STATE);
        }

        return state;
    }

    async updateState({ id, block, time }) {
        const name = `${this.chain}::${this.DEFAULT_STATE.name}`;
        const db = await getDatabase();
        await db.collection(config.table.state)
            .updateOne(
                { name },
                {
                    $setOnInsert: { name },
                    $set: { id, block, time }
                },
                { upsert: true });
    }

    sanitizeAction(action) {
        if (!action.data) action.data = {};
        if (action.data.metadata) {
            if (typeof (action.data.metadata) == "string") {
                try { action.data.metadata = JSON.parse(action.data.metadata); }
                catch (ex) { action.data.metadata = {}; }
            }
        }
        else {
            action.data.metadata = {};
        }
        return action;
    }

    pushUpdate(table, update) {
        let updates = this.updates[table];
        if (!updates) {
            updates = [];
            this.updates[table] = updates;
        }
        updates.push(update);
    }

    async commit() {
        const db = await getDatabase();
        for (const table in this.updates) {
            const updates = this.updates[table];
            if (updates && updates.length > 0) {
                await db.command({
                    update: table,
                    updates: updates
                });
            }
        }
        this.updates = {};
    }

    async getActionCollection() {
        const collection = await getCollection(this.table);
        return collection;
    }

    async migration() {
    }

    async tick() {
        const dispatch = this.dispatch;
        const state = await this.getState();
        console.log(`[${new Date().toLocaleTimeString()}] [${this.chain}::${this.DEFAULT_STATE.name}] state position = ${new Date(state.time).toLocaleString()}`);

        let actionCollection = await this.getActionCollection();
        let actions = (await actionCollection
            .find({
                id: { $gt: state.id },
                account: this.DEFAULT_STATE.name,
                chain: this.chain
            })
            .sort({ id: 1 })
            .limit(100)
            .toArray())
            .map(a => this.sanitizeAction(a));

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const dispatcher = dispatch[action.name];
            if (dispatcher) {
                await dispatcher.apply(this, [action]);
            }

            if (i > 0 && actions[i].transaction != actions[i - 1].transaction) {
                await this.commit();
            }
        }

        await this.commit();

        if (actions.length > 0) {
            await this.updateState(actions[actions.length - 1]);
        }
        else {
            // child service can tick, since we're up to date here
            if (this.childService) {
                await this.childService.tick();
            }
        }
    }

    async start() {
        await this.migration();
        for (; ;) {
            await this.tick();
            await sleep(1000);
        }
    }
}