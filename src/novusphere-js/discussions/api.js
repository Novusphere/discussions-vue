import * as axios from 'axios';
import ecc from 'eosjs-ecc';
import Joi from "@hapi/joi";
import { PostSearchQuery } from "./PostSearchQuery";
import { getFromCache } from "@/novusphere-js/utility";
import { Post } from './Post';
import { createTransferActions, signText/*, signHash*/ } from "@/novusphere-js/uid";
import { AccountSearchQuery } from './AccountSearchQuery';

let cache = {
    communities: undefined, // { tag, desc, icon }[]
};

function windowHost() {
    if (typeof window != "undefined") {
        return window.location.host;
    }
    return undefined;
}

function setAPIHost(host) {
    cache['apiHost'] = host;
}

async function getAPIHost() {
    return await getFromCache(cache, 'apiHost', async () => {
        const attempt = ["https://discussions.app", "https://beta.discussions.app"];

        if (typeof window != "undefined") {
            attempt.unshift(window.location.origin);
            if (window.location.origin.match(/localhost/i)) {
                attempt.unshift("http://localhost:8008");
            }
        }

        for (const url of attempt) {
            try {
                const pingUrl = `${url}/v1/api/data/test?ping=pong`;
                console.log(`Trying to connect to API: ${url}`);
                const { data } = await axios.get(pingUrl, { timeout: 1000 });
                if (data.payload.ping == 'pong') {
                    console.log(`Connected to ${url}`);
                    return url;
                }
            }
            catch {
                continue;
            }
        }

        const defaultApi = attempt[attempt.length - 1];
        console.log(`Could not connect to any API, defaulting to ${defaultApi}`);
        return defaultApi;
    });
}

async function createSignedBody(key, domain, body) {
    const signData = JSON.stringify({
        ...body,
        pub: ecc.privateToPublic(key),
        time: Date.now(),
        domain: domain || windowHost()
    });

    const sig = await signText(signData, key);

    body = { sig, data: signData };
    return body;
}

async function apiRequest(endpoint, body = undefined, { key, domain, redirect } = {}) {
    const host = await getAPIHost();
    const url = `${host}${endpoint}`;

    let result = undefined;
    if (body) {

        if (key) {
            body = await createSignedBody(key, domain, body);
        }

        if (redirect) {
            window.location.href = url + `?sig=${body.sig}&data=${encodeURIComponent(body.data)}`;
            return;
        }

        const { data } = await axios.post(url, body);
        result = data;
    }
    else {
        const { data } = await axios.get(url);
        result = data;
    }

    if (result.error) {
        console.log(`api error`);
        throw new Error(result.message);
    }

    return result.payload;
}

//
//
//
async function connectOAuth(identityKey, name, redirect, domain) {
    redirect = redirect || window.location.href;
    return await apiRequest(`/v1/api/account/passport/${name}`, { redirect }, {
        key: identityKey,
        redirect: true,
        domain
    });
}

//
//
//
async function removeOAuth(identityKey, name, domain) {
    return await apiRequest(`/v1/api/account/passport/${name}/remove`, {}, {
        key: identityKey,
        domain
    });
}

//
// Performs a a request to obtain an embed for a link
// NOTE: Will fail if `url` is not whitelisted
//
async function oembed(url) {
    return await apiRequest(`/v1/api/data/oembed?url=${url}`);
}

//
// Upload an image to the Discussions servers
//
async function uploadImage(file) {

    const formData = new FormData();
    formData.append("image", file);

    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/discussions/upload`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        }
    );

    if (data.error) {
        //.console.log(data.message);
        throw new Error(data.message);
    }

    return `https://atmosdb.novusphere.io/discussions/upload/image/${data.filename}`;
}

//
// Retrieve the tags currently trending on Discussions
//
async function getTrendingTags() {
    return await apiRequest(`/v1/api/data/trending`);
}

//
// Retrieves information about a users profile
//
async function getUserProfile(key, domain) {
    return await apiRequest(`/v1/api/data/profile?publicKey=${key}&domain=${domain || windowHost()}`);
}

//
// Retrieves connected social medias / auth for a user
//
async function getUserAuth(key, domain) {
    return await apiRequest(`/v1/api/data/auth?publicKey=${key}&domain=${domain || windowHost()}`);
}

//
// Retrieves all tokens known by Discussions API
//
async function getTokens() {
    return getFromCache(cache, 'tokens', async () => {
        return await apiRequest(`/v1/api/data/tokens`);
    });
}

//
// Retrieves all predefined community tags
//
async function getCommunities(domain) {
    return getFromCache(cache, 'communities', async () => {
        return await apiRequest(`/v1/api/data/communities?domain=${domain || windowHost()}`);
    });
}

//
// Retrieves popular users (by followers)
//
async function getPopularUsers(domain) {
    return await apiRequest(`/v1/api/data/popularusers?domain=${domain || windowHost()}`);
}


//
// Get Community by tag
// if [artifical] is enabled, if the community doesn't exist it'll borrow from the artifical community
//
async function getCommunityByTag(tag, artifical = 'atmos') {
    tag = tag.toLowerCase();
    const communities = await getCommunities();
    let community = communities.find(c => c.tag == tag);

    if (!community && artifical) {
        let borrow = communities.find(c => c.tag == artifical);
        if (borrow) {
            community = { ...borrow, members: 0, desc: '', html: '', tag: tag };
        }
    }
    return community;
}

//
// General Search Query
// see [AccountSearchQuery] object for documentation
//
/*function searchAccounts(searchQuery) {
    return new AccountSearchQuery(searchQuery);
}

function searchFollowers(pub, domain) {
    return searchAccounts({
        pipeline: [{
            $match: {
                "domain": domain || windowHost(),
                "data.followingUsers.pub": pub
            }
        }]
    });
}*/

//
// General Search Query
// See [PostSearchQuery] object for documentation
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
// getModeratorKeys(tag) => [pub1, pub2, ...]
//
async function getThread(referenceId, votePublicKey, getModeratorKeys, sinceTime = 0) {
    const opening = await getSinglePost(referenceId, votePublicKey);
    if (!opening) return undefined;

    const mods = moderators(votePublicKey, getModeratorKeys ? getModeratorKeys([opening.sub]) : []);

    const cursor = searchPosts({
        moderatorKeys: mods,
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

            const thrd = tree[comment.threadUuid];
            if (!thrd) continue;

            comment.threadTree = tree;
            comment.op = thrd.post;

            const existing = tree[comment.uuid];
            if (existing) {
                if (existing.post.pub == comment.pub) {
                    existing.post = comment;
                }
            }
            else {
                const parent = tree[comment.parentUuid];
                if (parent) {
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
        includeOpeningPost: true,
        sort,
        pipeline: [
            {
                $match: {
                    $or: [
                        { parentUuid: '', tags: { $in: tags } }, // top level only
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
        includeOpeningPost: true,
        sort,
        pipeline: [
            {
                $match: {
                    tags: { $in: tags },
                    $or: [
                        { parentUuid: '' }, // top level only
                        {
                            "tags.1": { $exists: true },
                            "tags.0": { $nin: tags }
                        }
                    ]
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
        includeOpeningPost: true,
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
// Search posts by notifications
//
function searchPostsByNotifications(key, lastSeenTime, watchedThreads) {
    return searchPosts({
        key,
        includeOpeningPost: true,
        sort: 'recent',
        pipeline: [
            {
                $match: {
                    $or: [
                        {
                            pub: { $ne: key }, // ignore self posts
                            mentions: { $in: [key] },
                            $or: [
                                { createdAt: { $gt: lastSeenTime } },
                                { editedAt: { $gt: lastSeenTime } }
                            ]
                        },
                        ...(watchedThreads || []).map(wt => ({
                            pub: { $ne: key }, // ignore self posts
                            threadUuid: wt.uuid,
                            $or: [
                                // only include posts from when we started watching, or that we haven't seen yet
                                { createdAt: { $gt: lastSeenTime ? lastSeenTime : wt.watchedAt } },
                                { editedAt: { $gt: lastSeenTime ? lastSeenTime : wt.watchedAt } }
                            ]
                        }))
                    ]
                }
            }
        ]
    });
}

//
// Submit a vote
//
async function submitVote(signKey, { uuid, value, uidw }) {
    const pub = ecc.privateToPublic(signKey);
    const nonce = Date.now();

    let vote = {
        voter: '',
        uuid: uuid,
        value: Number(value),
        metadata: JSON.stringify({
            uidw,
            nonce,
            pub,
            sig: await signText(ecc.sha256(`${value} ${uuid} ${nonce}`), signKey)
        })
    };

    const { transaction_id } = await apiRequest(`/v1/api/blockchain/vote`, { vote });
    return transaction_id;
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
        sig: await signText(ecc.sha256(post.uuid + ecc.sha256(post.content)), signKey)
    };

    let vote = {
        voter: '',
        uuid: post.uuid,
        value: 1,
        metadata: JSON.stringify({
            uidw: post.uidw || undefined,
            nonce: nonce,
            pub: pub,
            sig: await signText(ecc.sha256(`${1} ${post.uuid} ${nonce}`), signKey)
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

    let transfers = undefined;
    let notify = undefined;

    if (transferActions && transferActions.length > 0) {
        transfers = await createTransferActions(transferActions);
        notify = { name: 'tip', data: { parentUuid: post.parentUuid } };
    }

    const { transaction_id } = await apiRequest(`/v1/api/blockchain/post`, { vote, post: request, transfers, notify });
    return transaction_id;
}

//
// Sets a users tags for their mod policiy
//
async function modPolicySetTags(postKey, uuid, tags, domain) {
    return await apiRequest(`/v1/api/moderation/settags`, { uuid, tags }, { key: postKey, domain });
}

async function getUserDrafts(identityKey, domain) {
    return await apiRequest(`/v1/api/account/getdrafts`, {}, { key: identityKey, domain });
}

async function saveUserDrafts(identityKey, drafts, domain) {
    return await apiRequest(`/v1/api/account/savedrafts`, { drafts }, { key: identityKey, domain });
}


//
// Get user account object
//
async function getUserAccountObject(identityKey, domain) {
    try {
        return await apiRequest(`/v1/api/account/get`, {}, { key: identityKey, domain });
    }
    catch (ex) { // not found
        return null;
    }
}

//
// Saves a user account object
//
async function saveUserAccountObject(identityKey, accountObject, domain) {
    return await apiRequest(`/v1/api/account/save`, accountObject, { key: identityKey, domain });
}

async function restorePartialPosts(key, mods, thread, partialPosts) {
    const posts = [];
    if (partialPosts && partialPosts.length > 0) {
        const trxids = partialPosts.map(p => p.transaction);

        const cursor = searchPostsByTransactions(trxids);
        cursor.moderatorKeys = mods;
        cursor.votePublicKey = key;
        cursor.includeOpeningPost = thread ? false : true; // if it's a thread, no need to include op b/c it is the op

        do { posts.push(...await cursor.next()) }
        while (cursor.hasMore());
    }
    return posts;
}

async function getModeratedPosts(key, mods, tag, tags, domain, thread) {
    mods = moderators(key, mods);
    domain = domain || windowHost();

    const partialPosts = await apiRequest(`/v1/api/moderation/posts/${tag}`, { mods, tags, domain, thread });
    return await restorePartialPosts(key, mods, thread, partialPosts);
}

//
// Get pinned moderated posts
//
async function getPinnedPosts(key, mods, tags, domain, thread = true) {
    return await getModeratedPosts(key, mods, 'pinned', tags, domain, thread);
}

//
// Get spam moderated posts
//
async function getSpamPosts(key, mods, tags, domain) {
    return await getModeratedPosts(key, mods, 'spam', tags, domain);
}

//
// Get nsfw moderated posts
//
async function getNsfwPosts(key, mods, tags, domain) {
    return await getModeratedPosts(key, mods, 'nsfw', tags, domain);
}

//
// Combines a key and a set of moderator keys into a single array and removes duplicates
//
function moderators(key, mods) {
    return Array.from(new Set(key ? [key, ...mods] : mods));
}

export {
    Post,
    PostSearchQuery,
    windowHost,
    getAPIHost,
    setAPIHost,
    createSignedBody,
    apiRequest,
    oembed,
    uploadImage,
    submitPost,
    submitVote,
    //searchAccounts,
    //searchFollowers,
    searchPosts,
    searchPostsByAll,
    searchPostsByTags,
    searchPostsByFeed,
    searchPostsByKeys,
    searchPostsByTransactions,
    searchPostsByTextSearch,
    searchPostsByNotifications,
    getSinglePost,
    getThread,
    createThreadTree,
    mergeThreadToTree,
    getUserProfile,
    getUserAuth,
    getTrendingTags,
    getPopularUsers,
    getCommunities,
    getCommunityByTag,
    getTokens,
    modPolicySetTags,
    getPinnedPosts,
    getSpamPosts,
    getNsfwPosts,
    getUserAccountObject,
    saveUserAccountObject,
    getUserDrafts,
    saveUserDrafts,
    connectOAuth,
    removeOAuth
}