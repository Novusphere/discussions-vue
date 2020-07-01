import Vue from 'vue';
import Vuex from 'vuex';
//import { waitFor } from "@/novusphere-js/utility";

const LOCAL_STORAGE_KEY = 'vuexStore';

Vue.use(Vuex);

const getDefaultState = () => ({
    darkMode: false,
    hideSpam: true,
    blurNSFW: true,
    needSyncAccount: false,
    notificationCount: 0,
    lastSeenNotificationsTime: 0,
    isLoginDialogOpen: false,
    isTransferDialogOpen: false,
    isSendTipDialogOpen: false,
    isThreadDialogOpen: false,
    threadDialogRef1: '',
    threadDialogRef2: '',
    pendingTransfers: [],
    sendTipRecipient: null,
    tempPassword: '', // used to temporarily store the result of a user inputting their password, setTempPassword() should IMMEDIATELY be called after consumption to clear
    displayName: '',
    encryptedBrainKey: '',
    encryptedTest: '', // the value "test" encrypted with the same password as [encryptedBrainKey]
    keys: null,
    subscribedTags: [],
    followingUsers: [], // { displayName, pub, uidw }
    watchedThreads: [], // { uuid, transaction, watchedAt }
    delegatedMods: [ // { displayName, pub, tag }
        // hard coded list of preset moderators
        { displayName: 'xiaxiaxia', pub: 'EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe', tag: 'all' },
        { displayName: 'JacquesWhales', pub: 'EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH', tag: 'all' }
    ]
});

function saveAccount(state, external = true) {
    const account = {
        lastSeenNotificationsTime: state.lastSeenNotificationsTime,
        displayName: state.displayName,
        publicKeys: {
            arbitrary: state.keys.arbitrary.pub,
            identity: state.keys.arbitrary.pub,
            wallet: state.keys.wallet.pub // uidw 
        },
        subscribedTags: state.subscribedTags,
        followingUsers: state.followingUsers,
        watchedThreads: state.watchThreads,
        delegatedMods: state.delegatedMods,
        hideSpam: state.hideSpam,
        blurNSFW: state.blurNSFW,
        darkMode: state.darkMode
    };

    const local = {
        encryptedTest: state.encryptedTest,
        encryptedBrainKey: state.encryptedBrainKey,
        displayName: state.displayName,
        keys: state.keys,
        darkMode: state.darkMode
    }

    window.localStorage[LOCAL_STORAGE_KEY] = JSON.stringify(local);

    if (external && account) { // just put here to temporarily stop linter from complaining
        // TO-DO: save account to nsdb
    }
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
        addModerator(state, { displayName, pub, tag }) {
            tag = tag.toLowerCase();
            if (state.delegatedMods.some(dm => dm.pub == pub && dm.tag == tag)) return;
            state.delegatedMods.push({ displayName, pub, tag });
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
        followUser(state, { displayName, pub, uidw }) {
            if (pub == state.keys.arbitrary.pub) return; // self follow disallowed
            if (state.followingUsers.find(u => u.pub == pub)) return;
            state.followingUsers.push({ displayName, pub, uidw });
            saveAccount(state);
        },
        unfollowUser(state, pub) {
            state.followingUsers = state.followingUsers.filter(u => u.pub != pub);
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
        syncAccount(state, account) {
            state.needSyncAccount = false;
            if (!account) return;
            state.lastSeenNotificationsTime = account.lastSeenNotificationsTime;
            state.subscribedTags.push(...account.subscribedTags.filter(st => !state.subscribedTags.some(st2 => st == st2)));
            state.delegatedMods.push(...account.delegatedMods.filter(dm => !state.delegatedMods.some(dm2 => dm.pub == dm2.pub && dm.tag == dm2.tag)));
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

            const update = getDefaultState();

            // preserve encryptedBrainKey and displayName for easy re-login
            // preserve arbitrary pub for icon
            update.encryptedTest = state.encryptedTest;
            update.encryptedBrainKey = state.encryptedBrainKey;
            update.displayName = state.displayName;
            update.keys = {
                arbitrary: { pub: state.keys.arbitrary.pub },
                identity: { pub: state.keys.identity.pub },
                wallet: { pub: state.keys.wallet.pub }
            }

            Object.assign(state, update);

            saveAccount(state, false);
        }
    }
});