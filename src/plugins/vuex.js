import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const getDefaultState = () => ({
    isLoginDialogOpen: false,
    isTransferDialogOpen: false,
    isSendTipDialogOpen: false,
    pendingTransfers: [],
    sendTipRecipient: null,
    tempPassword: '', // used to temporarily store the result of a user inputting their password, setTempPassword() should IMMEDIATELY be called after consumption to clear
    displayName: '',
    encryptedBrainKey: '',
    encryptedTest: '', // the value "test" encrypted with the same password as [encryptedBrainKey]
    keys: null,
    subscribedTags: ['eos', 'atmos', 'vigor'],
    followingUsers: [] // { displayName, pub, uidw }
});

export default new Vuex.Store({
    state: getDefaultState(),
    getters: {
        isLoggedIn: state => {
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
        }
    },
    mutations: {
        importOld(state, { encryptedBrainKey, encryptedTest, displayName, keys }) {
            // this method is for legacy transaction only
            state.encryptedBrainKey = encryptedBrainKey;
            state.encryptedTest = encryptedTest;
            state.displayName = displayName;
            state.keys = keys;
        },
        followUser(state, { displayName, pub, uidw }) {
            if (pub == state.keys.arbitrary.pub) return; // self follow disallowed
            if (state.followingUsers.find(u => u.pub == pub)) return;
            state.followingUsers.push({ displayName, pub, uidw });
        },
        unfollowUser(state, pub) {
            state.followingUsers = state.followingUsers.filter(u => u.pub != pub);
        },
        subscribeTag(state, tag) {
            tag = tag.toLowerCase();
            if (state.subscribedTags.find(t => t == tag)) return;
            state.subscribedTags.push(tag);
        },
        unsubscribeTag(state, tag) {
            tag = tag.toLowerCase();
            state.subscribedTags = state.subscribedTags.filter(t => t != tag);
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
            state.isLoginDialogOpen = false;
            state.displayName = displayName;
            state.encryptedBrainKey = encryptedBrainKey;
            state.encryptedTest = encryptedTest;
            state.keys = {
                arbitrary: keys.arbitrary,
                identity: keys.identity,
                wallet: { key: '', pub: keys.wallet.pub } // redact the wallet private key
            }
        },
        forgetLoginSession(state) {
            const defaultState = getDefaultState();

            Object.assign(state, {
                encryptedTest: defaultState.encryptedTest,
                encryptedBrainKey: defaultState.encryptedBrainKey,
                displayName: defaultState.displayName,
                keys: defaultState.keys
            });
        },
        logout(state) {

            const update = getDefaultState();

            // preserve encryptedBrainKey and displayName for easy re-login
            // preserve arbitrary pub for icon
            update.encryptedTest = state.encryptedTest;
            update.encryptedBrainKey = state.encryptedBrainKey;
            update.displayName = state.displayName;
            update.keys = {
                arbitrary: { pub: state.keys.arbitrary.pub }
            }

            Object.assign(state, update);
        }
    }
});