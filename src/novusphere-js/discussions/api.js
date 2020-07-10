import * as axios from 'axios';
import ecc from 'eosjs-ecc';
import Joi from "@hapi/joi";
import { PostSearchQuery } from "./PostSearchQuery";
import { getFromCache, markdownToHTML, htmlToText } from "@/novusphere-js/utility";
import { Post } from './Post';
import { createTransferActions, signText, signHash, getSymbols } from "@/novusphere-js/uid";

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
    const { data } = await axios.get('https://atmosdb.novusphere.io/discussions/search/trendingtags');
    return data.payload; // { tag, members }
}

//
// Retrieves information about a users profile
//
async function getUserProfile(key) {
    const startTime = Date.now();
    const { data } = await axios.get(`https://atmosdb.novusphere.io/discussions/site/profile/${key}`);
    let displayName = (data ? data.displayName : '') || '[unknown]';
    console.proxyLog(`Took ${Date.now() - startTime}ms to retrieve profile object for ${displayName}@${key}`);
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


        const symbols = await getSymbols();
        let communities = Object
            .keys(tags)
            .map(t => ({
                tag: t,
                desc: tags[t].desc,
                icon: tags[t].icon,
                members: tags[t].members,
                html: markdownToHTML(tags[t].desc),
                symbol: tags[t].symbol || t.toUpperCase()
            }))
            .map(t => ({
                ...t,
                description: htmlToText(t.html),
                symbol: symbols.some(s => s == t.symbol) ? t.symbol : undefined
            }));

        return communities;
    });
}

//
// Get Community by tag
// if [artifical] is enabled, if the community doesn't exist it'll borrow from the artifical community
//
async function getCommunityByTag(tag, artifical = 'atmos') {
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
            sig: await signText(ecc.sha256(`${vote.value} ${vote.uuid} ${nonce}`), signKey)
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
        sig: await signText(ecc.sha256(post.uuid + ecc.sha256(post.content)), signKey)
    };

    let vote = {
        voter: '',
        uuid: post.uuid,
        value: 1,
        metadata: JSON.stringify({
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

    if (transferActions && transferActions.length > 0) {
        request.transfers = await createTransferActions(transferActions);
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
// Creates a standard signed request
// 
async function createStandardSignedRequest(key, domain, useSignHash, contents) {
    const time = Date.now();
    const pub = ecc.privateToPublic(key);
    const hash = ecc.sha256(contents || `${domain}-${time}`);
    const sig = await (useSignHash ? signHash : signText)(hash, key); // TO-DO: fix requests that use sign()

    return { time, pub, sig };
}

//
// Sets a users tags for their mod policiy
//
async function modPolicySetTags(postKey, uuid, tags, domain) {
    domain = domain || window.location.host;
    const { time, pub, sig } = await createStandardSignedRequest(postKey, domain);

    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/discussions/moderation/settags`,
        `time=${time}&pub=${pub}&sig=${sig}&tags=${tags.join(',')}&uuid=${uuid}&domain=${domain}`
    )

    //console.log(data);

    return data;
}

//
// Get user account object
//
async function getUserAccountObject(identityKey, domain) {
    domain = domain || window.location.host;
    const { time, pub, sig } = await createStandardSignedRequest(identityKey, domain, false); // TO-DO: fix this request to use sign

    const startTime = Date.now();
    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/account/data`,
        `time=${time}&pub=${pub}&sig=${sig}&domain=${domain}`
    )
    console.proxyLog(`Took ${Date.now() - startTime}ms to retrieve account object for ${identityKey} @ ${domain}`);

    return data.payload; // TO-DO: standardize this request...
}

//
// Saves a user account object
//
async function saveUserAccountObject(identityKey, accountObject, domain) {
    const json = JSON.stringify(accountObject);
    const { time, pub, sig } = await createStandardSignedRequest(identityKey, domain, false, json);

    const startTime = Date.now();
    const qs =
        `time=${time}&pub=${pub}&sig=${sig}&domain=${domain}&data=${encodeURIComponent(json)}`;
    //console.log(qs);
    const { data } = await axios.post(
        `https://atmosdb.novusphere.io/account/save`,
        qs
    );
    if (!data.payload) {
        console.log(data);
    }
    console.proxyLog(`Took ${Date.now() - startTime}ms to save account object for ${identityKey} @ ${domain}`);
}

//
// Get pinned posts (top level only)
//
async function getPinnedPosts(key, mods, tags, domain) {
    domain = domain || window.location.host;
    mods = moderators(key, mods);

    const qs = `domain=${domain}&mods=${mods.join(',')}&tags=${tags.join(',')}`;
    const { data } = await axios.post(`https://atmosdb.novusphere.io/discussions/moderation/pinned`, qs);

    let posts = [];
    if (data && data.length > 0) {
        const trxids = data.map(p => p.transaction);

        const cursor = searchPostsByTransactions(trxids);
        cursor.moderatorKeys = mods;
        cursor.votePublicKey = key;

        do { posts.push(...await cursor.next()) }
        while (cursor.hasMore());
    }

    return posts;
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
    cors,
    uploadImage,
    submitPost,
    submitVote,
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
    getTrendingTags,
    getCommunities,
    getCommunityByTag,
    getTokens,
    modPolicySetTags,
    getPinnedPosts,
    getUserAccountObject,
    saveUserAccountObject
}