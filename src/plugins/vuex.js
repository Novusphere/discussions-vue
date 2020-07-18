import Vue from 'vue';
import Vuex from 'vuex';
import { saveUserAccountObject } from "@/novusphere-js/discussions/api";
import { signText } from "@/novusphere-js/uid";
import { Lock } from "@/novusphere-js/utility";

const LOCAL_STORAGE_KEY = 'vuexStore';
const saver = new Lock();

Vue.use(Vuex);

const testerPublicKeys = [
    'EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe', // xia256
    'EOS66mZsNtdEVeFfxrxkZ9sZ5snwTPYmtRnEtHWhpyFovfnvDnCM5', // xia512
    'EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH', // jacques
    'EOS6sYMyMHzHhGtfwjCcZkRaw3YK5ws8xoD6ke2DNUmnHT3j1cpjV', // brain
    'EOS7RWM4YvxcUEhZfHozf8XVajgvfh8wvohoJS9vx8Hg1K12PDx5o', // paul
];

const getDefaultState = () => ({
    syncTime: 0,
    //
    isLoginDialogOpen: false,
    //
    isTransferDialogOpen: false,
    pendingTransfers: [],
    tempPassword: '', // used to temporarily store the result of a user inputting their password, setTempPassword() should IMMEDIATELY be called after consumption to clear
    //
    isSendTipDialogOpen: false,
    sendTipRecipient: null, // { pub, uidw, displayName, uuid?, callback? }
    //
    isThreadDialogOpen: false,
    threadDialogRef1: '',
    threadDialogRef2: '',
    //
    isImageUploadDialogOpen: false,
    onImageUpload: null,
    //
    isInsertLinkDialogOpen: false,
    initialInsertedLink: '',
    onInsertLink: null,
    //
    displayName: '',
    encryptedBrainKey: '',
    encryptedTest: '', // the value "test" encrypted with the same password as [encryptedBrainKey]
    keys: null,
    //
    darkMode: false,
    hideSpam: true,
    blurNSFW: true,
    needSyncAccount: false,
    notificationCount: 0,
    // --- saved ---
    lastSeenNotificationsTime: 0,
    subscribedTags: [],
    followingUsers: [], // { displayName, pub, uidw, nameTime }
    watchedThreads: [], // { uuid, transaction, watchedAt }
    delegatedMods: [ // { displayName, pub, tag, nameTime }
        // hard coded list of preset moderators
        { displayName: 'xia256', pub: 'EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe', tag: 'all' },
        { displayName: 'JacquesWhales', pub: 'EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH', tag: 'all' }
    ]
});

async function saveAccount(state, external = true) {
    await saver.lock(async () => {
        const local = {
            encryptedTest: state.encryptedTest,
            encryptedBrainKey: state.encryptedBrainKey,
            displayName: state.displayName,
            keys: state.keys,
            darkMode: state.darkMode
        }

        window.localStorage[LOCAL_STORAGE_KEY] = JSON.stringify(local);

        if (state.keys && state.keys.identity.key && external) {
            state.syncTime = Date.now();

            const account = {
                syncTime: state.syncTime,
                lastSeenNotificationsTime: state.lastSeenNotificationsTime,
                displayName: state.displayName,
                publicKeys: {
                    arbitrary: state.keys.arbitrary.pub,
                    identity: state.keys.arbitrary.pub,
                    wallet: state.keys.wallet.pub // uidw 
                },
                publicKeyProofs: {
                    // xxxYYY means [YYY] was signed with [xxx]
                    identityArbitrary: await signText(state.keys.arbitrary.pub, state.keys.identity.key),
                    arbitraryWallet: await signText(state.keys.wallet.pub, state.keys.arbitrary.key)
                },
                subscribedTags: state.subscribedTags,
                followingUsers: state.followingUsers,
                watchedThreads: state.watchThreads,
                delegatedMods: state.delegatedMods,
                hideSpam: state.hideSpam,
                blurNSFW: state.blurNSFW,
                darkMode: state.darkMode
            };

            if (account && saveUserAccountObject) {
                await saveUserAccountObject(state.keys.identity.key, account, window.location.host);
            }
        }
    });
}

export default new Vuex.Store({
    state: getDefaultState(),
    getters: {
        isLoggedIn: state => {
            if (state.needSyncAccount) return false;
            if (!state.displayName) return false;
            if (!state.encryptedBrainKey) return false;
            if (!state.keys) return false;
            if (!state.keys.arbitrary.key) return false;
            if (!state.keys.wallet.pub) return false;
            if (!state.keys.identity.key) return false;
            return true;
        },
        hasLoginSession: state => {
            if (!state.encryptedBrainKey) return false;
            if (!state.encryptedTest) return false;
            if (!state.displayName) return false;
            if (!state.keys) return false;
            if (!state.keys.arbitrary.pub) return false;
            return true;
        },
        isFollowing: state => {
            return key => {
                return state.followingUsers.find(u => u.pub == key);
            }
        },
        isSubscribed: state => {
            return tag => {
                tag = tag.toLowerCase();
                return state.subscribedTags.find(t => t == tag);
            }
        },
        isThreadWatched: state => {
            return uuid => {
                return state.watchedThreads.find(wt => wt.uuid == uuid);
            }
        },
        isTester: state => {
            if (!state.keys) return false;
            if (!state.keys.arbitrary.key) return false;
            return testerPublicKeys.some(p => state.keys.arbitrary.pub == p);
        },
        isModerator: state => {
            return (tag, publicKey) => {
                return state.delegatedMods
                    .some(dm => (dm.tag == "all" || dm.tag == tag) && dm.pub == publicKey);
            }
        },
        getModeratorKeys: state => {
            return tags => {
                const mods = state.delegatedMods
                    .filter(dm => dm.tag == "all" || tags.some(t => t == dm.tag))
                    .map(dm => dm.pub);
                return mods;
            }
        }
    },
    mutations: {
        set(state, [name, value]) {
            // performs a very basic mutation, should not be abused!!
            state[name] = value;
        },
        init(state) {
            let local = window.localStorage[LOCAL_STORAGE_KEY];
            try {
                local = JSON.parse(local);
                if (local.encryptedBrainKey && local.encryptedTest && local.displayName && local.keys) {
                    state.encryptedBrainKey = local.encryptedBrainKey;
                    state.encryptedTest = local.encryptedTest;
                    state.displayName = local.displayName;
                    state.keys = local.keys;
                    state.darkMode = local.darkMode;

                    // if false, they have a session -- but are not logged in.
                    if (state.keys.arbitrary.key)
                        state.needSyncAccount = true;
                }
            }
            catch (ex) {
                // TO-REMOVE: deprecate this code on 8/1/2020
                try {
                    console.log(`Trying to restore account from old authStore object...`);
                    let authStore = JSON.parse(window.localStorage["authStore"]);
                    let bk = JSON.parse(authStore.bk);
                    let encryptedBrainKey = bk.bk;
                    let encryptedTest = bk.bkc;
                    let displayName = authStore.displayName || bk.displayName;

                    let keys = {
                        arbitrary: { key: authStore.postPriv, pub: bk.post },
                        wallet: { pub: bk.uidwallet },
                        identity: { key: authStore.accountPrivKey, pub: bk.account }
                    };

                    // import old
                    state.encryptedBrainKey = encryptedBrainKey;
                    state.encryptedTest = encryptedTest;
                    state.displayName = displayName;
                    state.keys = keys;
                    state.needSyncAccount = true;

                    console.log(state);
                    console.log(`Restore was OK`);
                }
                catch (ex2) {
                    console.error(ex2);
                    return;
                }
                // ---
                return;
            }
        },
        setDarkMode(state, value) {
            state.darkMode = value;
            saveAccount(state);
        },
        addModerator(state, { displayName, pub, tag, nameTime }) {
            tag = tag.toLowerCase();
            if (state.delegatedMods.some(dm => dm.pub == pub && dm.tag == tag)) return;
            state.delegatedMods.push({ displayName, pub, tag, nameTime });
            saveAccount(state);
        },
        removeModerator(state, { pub, tag }) {
            state.delegatedMods = state.delegatedMods.filter(dm => !(dm.pub == pub && dm.tag == tag));
            saveAccount(state);
        },
        watchThread(state, { uuid, transaction }) {
            state.watchedThreads.push({ uuid, transaction, watchedAt: Date.now() });
            saveAccount(state);
        },
        unwatchThread(state, uuid) {
            state.watchedThreads = state.watchedThreads.filter(wt => wt.uuid != uuid);
            saveAccount(state);
        },
        seenNotifications(state) {
            state.lastSeenNotificationsTime = Date.now();
            saveAccount(state);
        },
        setNotificationCount(state, count) {
            state.notificationCount = count;
        },
        followUser(state, { displayName, pub, uidw, nameTime }) {
            if (pub == state.keys.arbitrary.pub) return; // self follow disallowed
            if (state.followingUsers.find(u => u.pub == pub)) return;
            state.followingUsers.push({ displayName, pub, uidw, nameTime });
            saveAccount(state);
        },
        unfollowUser(state, pub) {
            state.followingUsers = state.followingUsers.filter(u => u.pub != pub);
            saveAccount(state);
        },
        subscribeTag(state, tag) {
            tag = tag.toLowerCase();
            if (state.subscribedTags.find(t => t == tag)) return;
            state.subscribedTags.push(tag);
            saveAccount(state);
        },
        unsubscribeTag(state, tag) {
            tag = tag.toLowerCase();
            state.subscribedTags = state.subscribedTags.filter(t => t != tag);
            saveAccount(state);
        },
        setSendTipDialogOpen(state, { value, recipient }) {
            if (value) {
                state.isSendTipDialogOpen = true;
                state.sendTipRecipient = recipient;
            }
            else {
                state.isSendTipDialogOpen = false;
                state.sendTipRecipient = null;
            }
        },
        setTempPassword(state, password) {
            state.tempPassword = password || '';
        },
        setInsertLinkDialogOpen(state, { value, onInsertLink, initialInsertedLink }) {
            if (value) {
                state.isInsertLinkDialogOpen = true;
                state.onInsertLink = onInsertLink;
                state.initialInsertedLink = initialInsertedLink;
            }
            else {
                state.isInsertLinkDialogOpen = false;
                state.onInsertLink = null;
                state.initialInsertedLink = '';
            }
        },
        setImageUploadDialogOpen(state, { value, onImageUpload }) {
            if (value) {
                state.isImageUploadDialogOpen = true;
                state.onImageUpload = onImageUpload;
            }
            else {
                state.isImageUploadDialogOpen = false;
                state.onImageUpload = null;
            }
        },
        setThreadDialogOpen(state, { value, sub, referenceId, title, referenceId2, path }) {
            if (value) {
                state.isThreadDialogOpen = true;
                state.threadDialogRef1 = referenceId;
                state.threadDialogRef2 = referenceId2;

                window.history.pushState({}, null, `/tag/${sub}/${referenceId}/${title}/${referenceId2 || ''}`);
            }
            else {
                state.isThreadDialogOpen = false;
                state.threadDialogRef2 = '';
                state.threadDialogRef2 = '';

                window.history.pushState({}, null, path);
            }
        },
        setTransferDialogOpen(state, { value, transfers }) {
            if (value) {
                state.isTransferDialogOpen = true;
                state.pendingTransfers = transfers || [];
            }
            else {
                state.isTransferDialogOpen = false;
                state.pendingTransfers = [];
            }
        },
        setLoginDialogOpen(state, value) {
            state.isLoginDialogOpen = value;
        },
        login(state, { encryptedBrainKey, encryptedTest, displayName, keys }) {
            state.displayName = displayName;
            state.encryptedBrainKey = encryptedBrainKey;
            state.encryptedTest = encryptedTest;
            state.keys = {
                arbitrary: keys.arbitrary,
                identity: keys.identity,
                wallet: { key: '', pub: keys.wallet.pub } // redact the wallet private key
            }
            state.needSyncAccount = true;
            saveAccount(state, false);
        },
        updateDisplayNames(state, users) {
            let save = false;

            function update({ pub, displayName, nameTime }, collection, name) {
                const eu = collection.find(i => i.pub == pub);
                if (eu && (!eu.nameTime || nameTime > eu.nameTime) && eu.displayName != displayName) {
                    eu.displayName = displayName;
                    eu.nameTime = nameTime;
                    save = true;

                    console.log(name + ` ` + JSON.stringify(eu));
                }
            }

            for (const u of users) {
                update(u, state.followingUsers, `following`);
                update(u, state.delegatedMods, `delegated`);
            }

            if (save) {
                saveAccount(state);
            }
        },
        syncAccount(state, account) {
            state.needSyncAccount = false;
            if (!account) return;
            if (state.syncTime && account.syncTime <= state.syncTime) {
                console.log(`state sync=${state.syncTime}, account sync=${account.syncTime}`);
            }
            console.log(`syncAccount()`);

            state.syncTime = account.syncTime || 0;
            state.lastSeenNotificationsTime = account.lastSeenNotificationsTime;
            state.subscribedTags = [...account.subscribedTags];
            state.followingUsers = [...account.followingUsers];

            const fixedMods = getDefaultState().delegatedMods;
            state.delegatedMods = [...account.delegatedMods, ...fixedMods.filter(dm => !account.delegatedMods.some(dm2 => dm.pub == dm2.pub && dm.tag == dm2.tag))];
        },
        forgetLoginSession(state) {
            const defaultState = getDefaultState();

            Object.assign(state, {
                encryptedTest: defaultState.encryptedTest,
                encryptedBrainKey: defaultState.encryptedBrainKey,
                displayName: defaultState.displayName,
                keys: defaultState.keys
            });

            saveAccount(state, false);
        },
        logout(state) {

            const update = {
                ...getDefaultState(),
                darkMode: state.darkMode,
                encryptedTest: state.encryptedTest,
                encryptedBrainKey: state.encryptedBrainKey,
                displayName: state.displayName,
                keys: {
                    arbitrary: { pub: state.keys.arbitrary.pub },
                    identity: { pub: state.keys.identity.pub },
                    wallet: { pub: state.keys.wallet.pub }
                }
            };

            Object.assign(state, update);

            saveAccount(state, false);
        }
    }
});