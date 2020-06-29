import * as axios from 'axios';
import ecc from 'eosjs-ecc';
import Joi from "@hapi/joi";
import { PostSearchQuery } from "./PostSearchQuery";
import { getFromCache, markdownToHTML } from "@/novusphere-js/utility";
import { Post } from './Post';
import { createTransferActions } from "@/novusphere-js/uid";

let cache = {
    communities: undefined, // { tag, desc, icon }[]
};

//
// Performs a CORS request
// NOTE: Will fail if `url` is not whitelisted
//
async function cors(url) {
    const { data } = await axios.get(`https://atmosdb.novusphere.io/cors?${url}`);
    return data;
}

//
// Retrieve the tags currently trending on Discussions
//
async function getTrendingTags() {
    const { data } = await axios.get('https://atmosdb.novusphere.io/discussions/search/trendingtags');
    return data.payload; // { tag, members }
}

//
// Retrieves information about a users profile
//
async function getUserProfile(key) {
    const { data } = await axios.get(`https://atmosdb.novusphere.io/discussions/site/profile/${key}`);
    return data;
}

//
// Retrieves all tokens known by Discussions API
//
async function getTokens() {
    return getFromCache(cache, 'tokens', async () => {
        const { data } = await axios.get('https://atmosdb.novusphere.io/discussions/site/tokens');
        return data;
    });
}

//
// Retrieves all predefined community tags
//
async function getCommunities() {
    return getFromCache(cache, 'communities', async () => {
        const { data } = await axios.get('https://atmosdb.novusphere.io/discussions/site');
        const tags = data["discussions.app"].tags;

        const { data: data2 } = await axios.get(`https://atmosdb.novusphere.io/discussions/site/members/${Object.keys(tags).join(',')}`);
        for (const { tag, count } of data2) {
            tags[tag].members = count;
        }

        let communities = Object.keys(tags).map(t => ({
            tag: t,
            desc: tags[t].desc,
            icon: tags[t].icon,
            members: tags[t].members,
            html: markdownToHTML(tags[t].desc)
        }));

        return communities;
    });
}

//
// General Search Query
// See [SearchQuery] object for documentation
//
function searchPosts(searchQuery) {
    return new PostSearchQuery(searchQuery);
}

//
// Get a single [Post] by a reference id
// A reference id can be either the transaction id, post uuid, or the encoded post id
//
async function getSinglePost(referenceId, votePublicKey) {

    let match = undefined;

    if (referenceId.length == 64) {
        // transaction Id
        match = { transaction: referenceId };
    }
    else if (referenceId.length < 16) {
        // encoded id
        let { txid32, timeGte, timeLte } = Post.decodeId(referenceId);
        match = {
            createdAt: {
                $gte: timeGte,
                $lte: timeLte,
            },
            transaction: { $regex: `^${txid32}` },
        }

    }
    else {
        // assume uuid
        match = { postUuid: referenceId };
    }

    const cursor = searchPosts({
        votePublicKey,
        limit: 1,
        pipeline: [{ $match: match }]
    });

    const items = await cursor.next();

    if (items && items.length > 0) return items[0];
    else return undefined;
}

//
// Get a thread using a reference id
// A reference id can be any transaction id, post uuid or encoded post id that occurs within the thread 
//
async function getThread(referenceId, votePublicKey, sinceTime = 0) {
    const opening = await getSinglePost(referenceId, votePublicKey);
    if (!opening) return undefined;

    const cursor = searchPosts({
        votePublicKey,
        pipeline: [
            {
                $match: {
                    threadUuid: opening.threadUuid,
                    sub: opening.sub,
                    $or: [
                        { createdAt: { $gt: sinceTime } },
                        { editedAt: { $gt: sinceTime } },
                    ]
                }
            }
        ]
    });

    const replies = [];
    do {
        replies.push(...await cursor.next());
    }
    while (cursor.hasMore());

    return {
        opening,
        replies
    }
}

//
// Merges a thread object with an existing thread tree
//
function mergeThreadToTree(thread, tree) {
    if (thread.replies.length > 0 && tree) {
        for (const comment of thread.replies) {

            const existing = tree[comment.uuid];
            if (existing) {
                if (existing.post.pub == comment.pub) {
                    existing.post = comment;
                }
            }
            else {

                const parent = tree[comment.parentUuid];
                const thrd = tree[comment.threadUuid];

                if (parent && thrd) {
                    comment.threadTree = tree;
                    comment.op = thrd.post;

                    const reply = { post: comment, replies: [] };
                    tree[comment.uuid] = reply;
                    parent.replies.push(reply);
                }
            }
        }
    }
}

//
// Turns a thread (array of Post[]) into an object where the key is the post uuid
// and the object is [uuid] { post, replies } 
//
function createThreadTree(thread, ignore) {
    // build a tree from the posts
    let tree = {};
    tree[thread.opening.uuid] = { post: thread.opening, replies: [] };
    thread.opening.threadTree = tree;
    thread.opening.op = thread.opening;

    for (const comment of thread.replies) {
        if (ignore && ignore(comment)) continue;

        // these shouldn't normally happen, but possible from malicious user
        if (tree[comment.uuid]) continue;

        const reply = { post: comment, replies: [] };
        tree[comment.uuid] = reply;
        comment.threadTree = tree;
        comment.op = thread.opening;

        const parent = tree[comment.parentUuid];
        if (parent) {
            parent.replies.push(reply);
        }
    }

    return tree;
}

//
// Search query for all posts by a set of public keys
//
function searchPostsByKeys(keys, sort, topOnly) {
    const schema = Joi.object({
        keys: Joi.array()
            .items(Joi.string())
            .default([]),
        sort: Joi.string()
    });

    const validated = schema.validate({ keys, sort }).value;

    keys = validated.keys;
    sort = validated.sort;

    const match = {
        pub: { $in: keys }
    };

    if (topOnly) {
        match.parentUuid = '';
    }

    return searchPosts({
        sort,
        pipeline: [
            {
                $match: match,
            }
        ]
    });
}

//
// Search query for all top level posts for tags or users
// 
function searchPostsByFeed(tags, users, sort) {
    const schema = Joi.object({
        tags: Joi.array()
            .items(Joi.string())
            .default([]),
        users: Joi.array()
            .items(Joi.string())
            .default([]),
        sort: Joi.string()
    });

    const validated = schema.validate({ tags, users, sort }).value;

    tags = validated.tags.map(t => t.toLowerCase());
    users = validated.users;
    sort = validated.sort;

    return searchPosts({
        sort,
        pipeline: [
            {
                $match: {
                    parentUuid: '', // top level only
                    $or: [
                        { tags: { $in: tags } },
                        { pub: { $in: users } }
                    ]
                }
            }
        ]
    });
}

//  
// Search query for all top level posts for tags
//
function searchPostsByTags(tags, sort) {
    const schema = Joi.object({
        tags: Joi.array()
            .items(Joi.string())
            .default([]),
        sort: Joi.string()
    });

    const validated = schema.validate({ tags, sort }).value;

    tags = validated.tags.map(t => t.toLowerCase());
    sort = validated.sort;

    return searchPosts({
        sort,
        pipeline: [
            {
                $match: {
                    tags: { $in: tags },
                    parentUuid: '' // top level only
                }
            }
        ]
    });
}

//
// Search query for all top level posts
//
function searchPostsByAll(ignoreTags = ['test'], sort) {
    const schema = Joi.object({
        ignoreTags: Joi.array()
            .items(Joi.string())
            .default([]),
        sort: Joi.string()
    });

    const validated = schema.validate({ ignoreTags, sort }).value;

    ignoreTags = validated.ignoreTags;
    sort = validated.sort;

    return searchPosts({
        sort,
        pipeline: [
            {
                $match: {
                    tags: { $nin: ignoreTags },
                    parentUuid: '' // top level only
                }
            }
        ]
    });
}

//
// Search query by post transaction ids
//
function searchPostsByTransactions(transactions, sort) {
    const schema = Joi.object({
        transactions: Joi.array()
            .items(Joi.string()
                .alphanum()
                .min(64)
                .max(64))
            .required(),
        sort: Joi.string()
    });

    schema.validate({ transactions, sort });

    return searchPosts({
        sort,
        pipeline: [
            {
                $match: {
                    transaction: { $in: transactions }
                }
            }
        ]
    });
}

//
// Search query by post transaction ids
//
function searchPostsByTextSearch(text) {
    return searchPosts({
        pipeline: [
            {
                $match: {
                    $text: { $search: text },
                }
            }
        ]
    });
}

//
// Submit a vote
//
async function submitVote(signKey, vote) {
    if (vote.value < -1 || vote.value > 1) throw new Error(`Invalid vote value`);

    const pub = ecc.privateToPublic(signKey);
    const nonce = Date.now();

    let request = {
        voter: '',
        uuid: vote.uuid,
        value: vote.value,
        metadata: JSON.stringify({
            nonce: nonce,
            pub: pub,
            sig: ecc.sign(ecc.sha256(`${vote.value} ${vote.uuid} ${nonce}`), signKey)
        })
    };

    const requestData = JSON.stringify(request);

    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/discussions/vote`,
        `data=${encodeURIComponent(requestData)}`
    );

    if (data.error) {
        throw new Error(data.message);
    }

    return data.transaction;
}

//
// Submit a post
//
async function submitPost(signKey, post, transferActions) {
    const pub = ecc.privateToPublic(signKey);
    const nonce = Date.now();

    let metadata = {
        displayName: post.displayName,
        title: post.title || undefined,
        edit: post.edit ? true : undefined,
        uidw: post.uidw || undefined,
        mentions: Array.from(new Set(post.mentions || [])),
        pub: pub,
        sig: ecc.sign(ecc.sha256(post.uuid + ecc.sha256(post.content)), signKey)
    };

    let vote = {
        voter: '',
        uuid: post.uuid,
        value: 1,
        metadata: JSON.stringify({
            nonce: nonce,
            pub: pub,
            sig: ecc.sign(ecc.sha256(`${1} ${post.uuid} ${nonce}`), signKey)
        })
    };

    let request = {
        poster: '',
        content: post.content,
        uuid: post.uuid,
        vote: vote,
        threadUuid: post.threadUuid,
        parentUuid: post.parentUuid,
        tags: Array.from(new Set([post.sub, ...post.tags].map(t => t.toLowerCase()))),
        mentions: [], // deprecated
        metadata: JSON.stringify(metadata)
    };

    if (transferActions && transferActions.length > 0) {
        request.transfers = createTransferActions(transferActions);
        request.notify = JSON.stringify({ name: 'tip', data: { parentUuid: post.parentUuid } });
    }

    const requestData = JSON.stringify(request);

    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/discussions/post`,
        `data=${encodeURIComponent(requestData)}`
    );

    if (data.error) {
        throw new Error(data.message);
    }

    return data.transaction;
}

//
//  Sets a users tags for their mod policiy
//
async function modPolicySetTags(postKey, uuid, tags, domain) {
    const time = Date.now();
    const pub = ecc.privateToPublic(postKey);
    domain = domain || window.location.host;
    const hash = ecc.sha256(`${domain}-${time}`);
    const sig = ecc.signHash(hash, postKey);

    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/discussions/moderation/settags`,
        `time=${time}&pub=${pub}&sig=${sig}&tags=${tags.join(',')}&uuid=${uuid}&domain=${domain}`
    )

    //console.log(data);

    return data;
}

//
// Get pinned posts (top level only)
//
async function getPinnedPosts(key, mods, tags, domain) {
    domain = domain || window.location.host;
    mods = Array.from(new Set([key, ...mods]));

    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/discussions/moderation/pinned`,
        `domain=${domain}&mods=${mods.join(',')}&tags=${tags.join(',')}`
    );

    let posts = [];
    if (data && data.length > 0) {
        const trxids = data.map(p => p.transaction);

        const cursor = searchPostsByTransactions(trxids);
        cursor.votePublicKey = key;

        do { posts.push(...await cursor.next()) }
        while (cursor.hasMore());
    }

    return posts;
}

export {
    Post,
    PostSearchQuery,
    cors,
    submitPost,
    submitVote,
    searchPosts,
    searchPostsByAll,
    searchPostsByTags,
    searchPostsByFeed,
    searchPostsByKeys,
    searchPostsByTransactions,
    searchPostsByTextSearch,
    getSinglePost,
    getThread,
    createThreadTree,
    mergeThreadToTree,
    getUserProfile,
    getTrendingTags,
    getCommunities,
    getTokens,
    modPolicySetTags,
    getPinnedPosts
}