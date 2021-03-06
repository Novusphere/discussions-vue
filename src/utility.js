import { mapGetters, mapState } from "vuex";
import { waitFor } from "@/novusphere-js/utility";
import { encrypt, decrypt, brainKeyToKeys, isValidBrainKey, findInvalidBrainKeyWord } from "@/novusphere-js/uid";

//
// Wrap a Vue component export to watch for isLoggedIn and require it, otherwise redirect
//
function requireLoggedIn(component) {
    let created = component.created;
    let watch = component.watch;
    let computed = component.computed;

    component.created = async function () {
        if (this.needSyncAccount) {
            await waitFor(async () => !this.needSyncAccount, 100);
        }
        if (!this.isLoggedIn) this.$router.push(`/`);
        else if (created) created.apply(this, arguments);
    };

    component.computed = {
        ...computed,
        ...mapGetters(["isLoggedIn"]),
        ...mapState({
            needSyncAccount: state => state.needSyncAccount
        })
    };

    component.watch = {
        ...watch,
        isLoggedIn() {
            if (!this.isLoggedIn) this.$router.push(`/`);
            if (watch && watch.isLoggedIn) watch.isLoggedIn.apply(this, arguments);
        }
    };

    return component;
}

function displayNameRules(displayName) {
    return {
        displayNameRules() {
            const rules = [];
            if (this[displayName].length < 3) {
                rules.push(`Display name must be at least 3 characters`);
            }

            if (this[displayName].length > 16) {
                rules.push(`Display names can be at most 16 characters`);
            }

            const validNameRegex = /[a-zA-Z0-9_]+/g;
            const match = this[displayName].match(validNameRegex);
            if (!match || match[0] != this[displayName]) {
                rules.push(
                    `Display names may only contain letters, numbers, underscores`
                );
            }
            return rules;
        }
    }
}

function passwordRules(password) {
    return {
        passwordRules() {
            const rules = [];
            if (this[password].length < 5) {
                rules.push(`Password must be at least 5 characters`);
            }
            return rules;
        }
    }
}

function passwordTesterRules(password, encryptedTest) {
    return {
        passwordTesterRules() {
            const rules = [];
            if (decrypt(this[encryptedTest], this[password]) != "test") {
                rules.push(`Password is incorrect`);
            }
            return rules;
        }
    }
}

function brainKeyRules(brainKey) {
    return {
        brainKeyRules() {
            const rules = [];
            const bkValue = this[brainKey];

            if (!isValidBrainKey(bkValue)) {
                const invalidWord = findInvalidBrainKeyWord(bkValue);
                if (invalidWord)
                    rules.push(`Invalid brain key mnemonic - "${invalidWord}" may be invalid or spelled incorrectly`);
                else
                    rules.push(`Invalid brain key mnemonic`);
            }

            return rules;
        }
    }
}

async function createLoginObject({ displayName, brainKey, password }) {
    const keys = await brainKeyToKeys(brainKey);

    return {
        encryptedBrainKey: encrypt(brainKey, password),
        encryptedTest: encrypt("test", password),
        displayName: displayName,
        keys: keys
    };
}

function getBuildVersion() {
    let build = '';
    if (window.__BUILD__) {
        build = `S-${new Date(window.__BUILD__).getTime().toString(16)}`;
    } else {
        build = `C-${new Date().getTime().toString(16)}`;
    }
    return build;
}

export {
    requireLoggedIn,
    displayNameRules,
    passwordRules,
    passwordTesterRules,
    brainKeyRules,
    createLoginObject,
    getBuildVersion
}