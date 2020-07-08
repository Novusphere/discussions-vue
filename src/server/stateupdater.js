import { info } from "node-sass";

import ecc from 'eosjs-ecc';
import { sleep } from "@/novusphere-js/utility";
import { config, getCollection } from "./mongo";

export default class StateUpdater {
    constructor() {
        this.started = false;
    }
    async getState() {
        const state = await getCollection(config.table.state)
            .find({ name: `discussions` })
            .sort({ id: -1 })
            .limit(1)
            .next();
        return state;
    }
    async getStatePosition() {
        const state = await this.getState();
        return state ? Number(state[config.contract.discussions]) : 0;
    }
    isValidPostSignature(actionData) {
        const metadata = actionData.data.metadata;
        if (!metadata) return false;
        if (!metadata.pub) return false;
        if (!metadata.sig) return false;

        const hash0 = ecc.sha256(actionData.data.uuid + ecc.sha256(i.data.content));
        const rpk = ecc.recoverHash(metadata.sig, hash0);
        return (rpk == metadata.pub);
    }
    isValidVoteSignature(actionData) {
        const metadata = actionData.data.metadata;
        if (!metadata) return false;
        if (!metadata.pub) return false;
        if (!metadata.sig) return false;

        const hash0 = ecc.sha256(`${actionData.data.value} ${actionData.data.uuid} ${metadata.nonce}`);
        const rpk = ecc.recoverHash(metadata.sig, hash0);
        return (rpk == metadata.pub);
    }
    isValidAction(actionData) {
        if (actionData.name == "vote") {
            if (!this.isValidVoteSignature(actionData)) return false;
        }
        else if (actionData.name == "post") {
            if (!this.isValidPostSignature(actionData)) return false;
        }
        return true;
    }
    async getNextActions() {
        let position = await this.getStatePosition();
        let items = await getDatabase(config.actionDatabase)
            .collection(config.contracts.discussions)
            .find({ id: { $gt: position } })
            .sort({ id: 1 })
            .limit(100)
            .toArray();

        // parse the metadata into an object
        items.forEach(i => {
            if (!i.data) i.data = {};
            if (i.data.metadata) {
                try { i.data.metadata = JSON.parse(i.data.metadata); }
                catch (ex) { }
            }
        });

        return items.filter(actionData => this.isValidAction(actionData));

    }
    async startProcess() {
        this.started = true;
        while (this.started) {

            let items = await this.getNextActions();

            await sleep(1000);
        }
    }
    async stop() {
        this.started = false;
    }
}