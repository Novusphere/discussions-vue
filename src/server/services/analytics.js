import { config, getDatabase } from "../mongo";
import { sleep } from "@/novusphere-js/utility";
import siteConfig from "../site";


const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = ONE_DAY * 30;
const ONE_YEAR = ONE_DAY * 365;

const STAT_GENESIS = 1583020800000; // march 1st, 2020

const DEFAULT_STATE = {
    name: "analytics",
    dayTime: STAT_GENESIS,
    snapshotTime: Date.now() - ONE_DAY
};

class analytics {
    async getState() {
        const db = await getDatabase();
        let state = await db.collection(config.table.state)
            .find({ name: DEFAULT_STATE.name })
            .limit(1)
            .next();

        if (!state) {
            state = {};
            Object.assign(state, DEFAULT_STATE);
        }

        return state;
    }

    async updateState({ dayTime, snapshotTime }) {
        const db = await getDatabase();
        await db.collection(config.table.state)
            .updateOne(
                { name: DEFAULT_STATE.name },
                {
                    $setOnInsert: { name: DEFAULT_STATE.name },
                    $set: {
                        dayTime,
                        snapshotTime
                    }
                },
                { upsert: true });
    }

    async aggregatePosts(time) {
        const db = await getDatabase();
        const posts = await db.collection(config.table.posts)
            .aggregate([
                {
                    $match: {
                        createdAt: time
                    }
                },
                { $unwind: "$tags" },
                {
                    $group: {
                        _id: "$tags",
                        count: { $sum: 1 }
                    }
                }
            ])
            .toArray();

        const result = {};
        for (const { _id, count } of posts) {
            result[_id] = count;
        }

        return result;
    }

    async aggregateTransactions(time) {
        const db = await getDatabase();
        const trxs = await db.collection(config.table.uid)
            .find({
                name: "transfer",
                account: "nsuidcntract",
                time
            })
            .toArray();

        const summary = {
            count: {
                trxs: trxs.length,
                tlc: 0,
                tips: 0,
                swap: 0
            },
            tlc: {},
            tips: {},
            swap: {},
            swapPairs: {},
            volume: {}
        }

        for (const trx of trxs) {
            const volume = parseFloat(trx.data.fee) + parseFloat(trx.data.amount);

            const [, feeSymbol] = trx.data.fee.split(' ');
            summary.volume[feeSymbol] = (summary.volume[feeSymbol] || 0) + volume;

            if (trx.data.memo.indexOf('tip to') > -1) {
                summary.tips[feeSymbol] = (summary.tips[feeSymbol] || 0) + volume;
                summary.count.tips += 1;
            }
            else if (trx.data.memo.indexOf('pay for content') > -1) {
                summary.tlc[feeSymbol] = (summary.tlc[feeSymbol] || 0) + volume;
                summary.count.tlc += 1;
            }
            else if (trx.data.memo.indexOf('Token swap') > -1) {
                summary.swap[feeSymbol] = (summary.swap[feeSymbol] || 0) + volume;
                summary.count.swap += 1;

                // keep track of the swap pairs
                const swapSymbols = trx.data.memo.match(/[A-Z]{2,}/g);
                if (swapSymbols && swapSymbols.length == 2) {
                    const pair = `${swapSymbols[0]}-${swapSymbols[1]}`;
                    summary.swapPairs[pair] = (summary.swapPairs[pair] || 0) + 1;
                }
            }
        }

        return summary;
    }


    async getSnapshotStats(snapshotTime, now) {
        const pipeline = [
            { $match: { domain: siteConfig.domain } },
            { $unwind: "$subscribedTags" },
            { $group: { _id: "$subscribedTags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            {
                $project:
                {
                    _id: false,
                    tag: "$_id",
                    count: "$count"
                }
            },
        ];

        const db = await getDatabase();
        let members = (await db
            .collection(config.table.accounts)
            .aggregate(pipeline)
            .toArray())
            .reduce((obj, { tag, count }) => {
                obj[tag] = count || 0;
                return obj;
            }, {});

        return {
            type: 'snapshot',
            communities: members,
            time: now
        }
    }

    async get24hAnalysisStats(fromTime) {
        const db = await getDatabase();
        const time = { $gte: fromTime, $lt: fromTime + (ONE_DAY) };

        const eosAccounts = await db.collection(config.table.uid)
            .countDocuments({
                name: "transfer",
                "data.to": "signupeoseos",
                time
            });

        const stakeRewarded = await db.collection(config.table.uid)
            .countDocuments({
                name: "transfer",
                "data.from": "atmosstakerw",
                time
            });

        const posts = await db.collection(config.table.discussions)
            .countDocuments({
                account: "discussionsx",
                name: "post",
                time
            });

        const threads = await db.collection(config.table.discussions)
            .countDocuments({
                account: "discussionsx",
                name: "post",
                "data.parentUuid": "",
                time
            });

        const trxs = await this.aggregateTransactions(time);
        const content = await this.aggregatePosts(time);

        return {
            type: 'analysis',
            eosAccounts,
            stakeRewarded,
            posts,
            threads,
            trxs,
            content,
            time: fromTime
        };
    }

    makeUpdateObject(stats) {
        return {
            upsert: true,
            q: {
                type: stats.type,
                time: stats.time
            },
            u: {
                ...stats
            }
        };
    }

    async start() {
        for (; ;) {
            const now = Date.now();
            const updates = [];
            const state = await this.getState();

            console.log(`[${new Date().toLocaleTimeString()}] [analytics] last day = ${new Date(state.dayTime).toLocaleString()}`);

            if (now - state.dayTime > ONE_DAY) {
                updates.push(this.makeUpdateObject(await this.get24hAnalysisStats(state.dayTime)));
                state.dayTime += ONE_DAY;
            }

            if (now - state.snapshotTime > ONE_DAY) {
                updates.push(this.makeUpdateObject(await this.getSnapshotStats(state.snapshotTime, now)));
                state.snapshotTime = now;
            }

            if (updates.length > 0) {

                const db = await getDatabase();

                await db.command({
                    update: config.table.analytics,
                    updates: updates
                });

                this.updateState(state);
            }


            // if we're not caught up, only sleep 1s, otherwise sleep 30min
            if (now - state.dayTime > ONE_DAY) {
                await sleep(1000);
            }
            else {
                // rest 30 min
                for (let i = 0; i < 30; i++)
                    await sleep(60 * 1000);
            }
        }
    }
}

export default {
    start() {
        const a = new analytics();
        a.start();
        return a;
    }
}