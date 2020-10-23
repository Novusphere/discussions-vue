import { config, getDatabase } from "../mongo";
import ecc from "eosjs-ecc";
import site from "../site";
import EOSContractService from "./EOSContractService";

function verifyPostSignature(action) {
    const { pub, sig } = action.data.metadata;
    if (!pub || !sig) return false;

    const { uuid, content } = action.data;

    const hash0 = ecc.sha256(uuid + ecc.sha256(content));
    const publicKey = ecc.recover(sig, hash0);
    if (publicKey != pub) {
        return false;
    }

    return true;
}

function verifyVoteSignature(action) {
    const { pub, sig, nonce } = action.data.metadata;
    if (!pub || !sig || !nonce) return false;

    const { value, uuid } = action.data;
    if (!uuid) return false;

    if (value < -1 || value > 1 || isNaN(value)) return false; // vote values are -1, 0, 1

    const hash0 = ecc.sha256(`${value} ${uuid} ${nonce}`);
    const publicKey = ecc.recover(sig, hash0);
    if (publicKey != pub) {
        return false;
    }
    return true;
}

//
// Monitors the actions from `discussionsx`, `nsuidcntract` and updates state accordingly 
//
class DiscussionsService extends EOSContractService {
    constructor(contract, chain, childService) {
        super(config.table.discussions, contract, chain, childService);
        this.dispatch = {
            "post": this.post,
            "vote": this.vote,
            "notify": this.notify,
            "transfer": this.transfer,
        };
    }

    createSearchMeta(action) {
        const fields = [
            action.transaction,
            action.data.metadata.displayName || action.data.poster,
            action.data.metadata.pub,
            action.data.metadata.title
        ];
        return fields.filter(v => v).join(' ');
    }

    async edit(action) {
        this.pushUpdate(config.table.posts, {
            q: {
                chain: 'eos',
                uuid: action.data.parentUuid,
                poster: action.data.poster,
                sub: action.data.tags[0],
                pub: action.data.metadata.pub
            },
            u: {
                $set: {
                    content: action.data.content,
                    editedAt: action.time,
                    tags: action.data.tags,
                    mentions: action.data.metadata.mentions || [],
                    edit: action.data.uuid,
                    pub: action.data.metadata.pub || '',
                    sig: action.data.metadata.sig || '',
                    title: action.data.metadata.title || '',
                    //paywall: action.data.metadata.paywall || undefined,
                },
                $push: {
                    searchMeta: this.createSearchMeta(action)
                }
            }
        });
    }

    async post(action) {
        if (!verifyPostSignature(action)) return;// console.log(`${action.transaction} failed signature`);
        if (action.data.metadata.edit) return await this.edit(action);

        if (action.data.parentUuid) {
            this.pushUpdate(config.table.posts, {
                q: {
                    chain: 'eos',
                    uuid: action.data.parentUuid,
                    sub: action.data.tags[0]
                },
                u: {
                    $inc: { totalReplies: 1 }
                },
            });

            if (action.data.threadUuid != action.data.parentUuid) {
                this.pushUpdate(config.table.posts, {
                    q: {
                        chain: 'eos',
                        uuid: action.data.threadUuid,
                        sub: action.data.tags[0]
                    },
                    u: {
                        $set: { lastReplyAt: action.time },
                        $inc: { totalReplies: 1 }
                    },
                });
            }
        }

        this.pushUpdate(config.table.posts, {
            upsert: true,
            q: {
                chain: 'eos',
                transaction: action.transaction
            },
            u: {
                chain: 'eos',
                id: action.id,
                createdAt: action.time,
                editedAt: 0,
                lastReplyAt: action.time,
                transaction: action.transaction,
                blockApprox: action.block,
                uuid: action.data.uuid,
                parentUuid: action.data.parentUuid,
                threadUuid: action.data.threadUuid,
                title: action.data.metadata.title || '',
                poster: action.data.poster,
                displayName: action.data.metadata.displayName || action.data.poster,
                content: action.data.content,
                sub: action.data.tags[0],
                tags: action.data.tags,
                mentions: action.data.metadata.mentions || [],
                edit: '',
                uidw: action.data.metadata.uidw || '',
                pub: action.data.metadata.pub || '',
                sig: action.data.metadata.sig || '',
                totalReplies: 0,
                upvotes: 0,
                downvotes: 0,
                tipscore: 0,
                tips: [],
                paywall: action.data.metadata.paywall || undefined,
                searchMeta: [this.createSearchMeta(action)]
            }
        });
    }

    async vote(action) {
        if (!verifyVoteSignature(action)) return;

        const value = Number(action.data.value);
        const db = await getDatabase();
        const previousVote = await db.collection(config.table.votes)
            .find({
                uuid: action.data.uuid,
                pub: action.data.metadata.pub
            })
            .limit(1)
            .next();

        if (previousVote) {
            if (previousVote.value == value) return; // no change in value
            if (previousVote.nonce >= action.data.metadata.nonce) return;
        }

        let up = 0, down = 0;
        if (previousVote) {
            if (previousVote.value == -1) down--;
            else if (previousVote.value == 1) up--;
        }
        if (value == -1) down++;
        else if (value == 1) up++;

        this.pushUpdate(config.table.votes, {
            upsert: true,
            multi: false,
            q: {
                uuid: action.data.uuid,
                pub: action.data.metadata.pub
            },
            u: {
                uuid: action.data.uuid,
                pub: action.data.metadata.pub,
                sig: action.data.metadata.sig,
                nonce: action.data.metadata.nonce,
                value: action.data.value
            }
        });

        this.pushUpdate(config.table.posts, {
            multi: false,
            q: {
                chain: 'eos',
                uuid: action.data.uuid,
            },
            u: {
                $inc: {
                    upvotes: up,
                    downvotes: down
                }
            },
        });
    }

    async tip(action) {
        //
        // LEGACY
        //

        let { parentUuid } = action.data.metadata.data;
        if (!parentUuid) return;// console.log(`invalid parent uuid`);

        const db = await getDatabase();
        const parent = await db.collection(config.table.posts)
            .find({ uuid: parentUuid })
            .limit(1)
            .next();

        if (!parent) return;// console.log(`parent not found`);
        if (!parent.uidw) return;// console.log(`parent has no uidw`);

        let actionCollection = await this.getActionCollection();
        let tips = (await actionCollection
            .find({ transaction: action.transaction, name: 'transfer' })
            .toArray())
            .filter(t => t.data.to == parent.uidw)
            .map(t => ({
                transaction: t.transaction,
                data: t.data
            }));

        if (tips.length > 0) {
            let tipscore = tips
                .filter(t => !site.trustedRelay || site.trustedRelay.some(tr => t.data.relayer == tr))
                .reduce((score, t) => {
                    let [, token] = t.data.amount.split(' ');
                    if (token == 'ATMOS') {
                        const total = parseFloat(t.data.amount) + parseFloat(t.data.fee);
                        return score + Math.log2(total);
                    }
                    return score;
                }, 0);

            this.pushUpdate(config.table.posts, {
                q: { transaction: parent.transaction },
                u: {
                    $inc: { tipscore: Math.round(tipscore + 0.5) },
                    $push: { tips: { $each: tips } }
                }
            });
        }
    }

    async tipNew(action) {
        //console.log(`tipNew`, action);

        let { parentUuid } = action.data.metadata.data;
        if (!parentUuid) return;// console.log(`invalid parent uuid`);

        const db = await getDatabase();
        const parent = await db.collection(config.table.posts)
            .find({ uuid: parentUuid })
            .limit(1)
            .next();

        if (!parent) return;// console.log(`parent not found`);
        if (!parent.uidw) return;// console.log(`parent has no uidw`);
        if (parent.uidw != action.data.to) return;

        let tips = [action]
            .map(t => ({
                transaction: t.transaction,
                data: t.data
            }));

        if (tips.length > 0) {
            let tipscore = tips
                .filter(t => !site.trustedRelay || site.trustedRelay.some(tr => t.data.relayer == tr))
                .reduce((score, t) => {
                    let [, token] = t.data.amount.split(' ');
                    if (token == 'ATMOS') {
                        const total = parseFloat(t.data.amount) + parseFloat(t.data.fee);
                        return score + Math.log2(total);
                    }
                    return score;
                }, 0);

            this.pushUpdate(config.table.posts, {
                q: { transaction: parent.transaction },
                u: {
                    $inc: { tipscore: Math.round(tipscore + 0.5) },
                    $push: { tips: { $each: tips } }
                }
            });
        }
    }

    async notify(action) {
        if (!action.data.metadata) return;

        let { name } = action.data.metadata;
        if (!name) return;

        const dispatch = {
            'tip': this.tip
        };

        const dispatcher = dispatch[name];
        if (dispatcher) {
            await dispatcher.apply(this, [action]);
        }
    }

    async transfer(action) {
        if (action.account != config.contract.uid) return;// console.log(1);
        if (!action.data.metadata) return;// console.log(2);

        let { name } = action.data.metadata;
        if (!name) return;// console.log(3);

        const dispatch = {
            'tip': this.tipNew
        };

        const dispatcher = dispatch[name];
        if (dispatcher) {
            await dispatcher.apply(this, [action]);
        }
    }

    async migration() {

        //const collection = await getCollection(config.table.discussions);
        //const res = await collection.updateMany({ chain: { $exists: false } }, { $set: { chain: 'eos' } });

        //await (await getCollection(config.table.posts)).deleteMany({ createdAt: { $gt: 1603172986823 } });
        //await (await getCollection(config.table.votes)).deleteMany({ createdAt: { $gt: 1603172986823 } });
        //await (await getCollection(config.table.discussions)).deleteMany({ time: { $gt: 1603172986823 } });

        /*const db = await getCollection(config.table.accounts);
        const res = await db.updateMany({
            "data.followingUsers": { $exists: true },
            "data.subscribedTags": { $exists: true }
        }, {
            $rename: {
                "data.followingUsers": "followingUsers",
                "data.subscribedTags": "subscribedTags"
            }
        });*/

        //console.log(`=== migration ===`);
        //console.log(res);
    }
}

export default {
    verifyPostSignature,
    verifyVoteSignature,
    start() {
        // create dependency hiearchy
        // discussionsx > nsuidcntract > telos nsuidcntract
        const nsuidcntracttelos = new DiscussionsService(config.contract.uid, 'telos');
        const nsuidcntract = new DiscussionsService(config.contract.uid, 'eos', nsuidcntracttelos);
        const discussionsx = new DiscussionsService(config.contract.discussions, 'eos', nsuidcntract);
        discussionsx.start();
        return discussionsx;
    }
}