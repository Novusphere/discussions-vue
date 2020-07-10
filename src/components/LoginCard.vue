<template>
  <v-card flat tile>
    <v-card-text>
      <v-container>
        <v-form ref="form" v-model="validForm" @submit.prevent="login()">
          <div v-if="!hasLoginSession">
            <v-row>
              <v-col cols="12">
                <v-tabs v-model="keyMethodTab">
                  <v-tab>Brain Key</v-tab>
                  <v-tab>Wallet</v-tab>
                </v-tabs>

                <v-tabs-items v-model="keyMethodTab">
                  <v-tab-item>
                    <v-textarea
                      v-model="brainKey"
                      :rules="brainKeyRules"
                      label="Brain Key Mnemonic"
                      hint="Enter your brain key mnemonic"
                      required
                    >
                    </v-textarea>
                  </v-tab-item>
                  <v-tab-item>
                    <div class="text-center" v-show="walletError">
                      <span class="error--text">{{ walletError }}</span>
                    </div>
                    <ConnectWalletBtn
                      ref="connector"
                      color="primary"
                      class="mt-2"
                      @connected="walletConnected"
                      @error="(e) => walletError = e"
                    >
                      <template v-slot:disconnect="{ logout }">
                        <v-btn class="ml-2" color="primary" @click="logout">Disconnect Wallet</v-btn>
                      </template>
                    </ConnectWalletBtn>
                  </v-tab-item>
                </v-tabs-items>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="displayName"
                  :rules="displayNameRules"
                  label="Display Name"
                  required
                >
                  <template v-slot:prepend>
                    <PublicKeyIcon v-if="publicKey" :publicKey="publicKey" />
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </div>
          <div v-else>
            <v-row>
              <v-col cols="12">
                <PublicKeyIcon :size="80" :publicKey="oldPublicKey" />
                <div class="d-inline-block ml-2">
                  <h1 class="d-inline">{{ oldDisplayName }}</h1>
                  <v-btn icon class="ml-3 mb-3" @click="$store.commit('forgetLoginSession')">
                    <v-icon>delete</v-icon>
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </div>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="password"
                :rules="passwordRules2"
                label="Password"
                type="password"
                required
                @keydown.enter="login()"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-form>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="$store.commit('setLoginDialogOpen', false)">Close</v-btn>
      <v-btn :disabled="waiting || !validForm" color="primary" @click="login()">
        <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>
        <span>Log in</span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import ecc from "eosjs-ecc";
import {
  createLoginObject,
  displayNameRules,
  passwordRules,
  passwordTesterRules,
  brainKeyRules
} from "@/utility";
import PublicKeyIcon from "@/components/PublicKeyIcon";
import ConnectWalletBtn from "@/components/ConnectWalletBtn";
import { getUserProfile } from "@/novusphere-js/discussions/api";
import {
  decrypt,
  brainKeyFromHash,
  isValidBrainKey,
  brainKeyToKeys
} from "@/novusphere-js/uid";
import { sleep, waitFor } from "@/novusphere-js/utility";

export default {
  name: "LoginCard",
  components: {
    PublicKeyIcon,
    ConnectWalletBtn
  },
  props: {},
  data: () => ({
    keyMethodTab: 0,
    walletError: "",
    publicKey: "",
    brainKey: "",
    displayName: "",
    password: "",
    waiting: false,
    validForm: false
  }),
  computed: {
    ...brainKeyRules("brainKey"),
    ...displayNameRules("displayName"),
    ...passwordRules("password"),
    ...passwordTesterRules("password", "oldEncryptedTest"),
    passwordRules2() {
      const rules = [];
      if (this.hasLoginSession) {
        rules.push(...this.passwordTesterRules);
      } else {
        rules.push(...this.passwordRules);
      }
      return rules;
    },
    ...mapGetters(["hasLoginSession"]),
    ...mapState({
      oldEncryptedTest: state => state.encryptedTest,
      oldDisplayName: state => state.displayName,
      oldPublicKey: state => state.keys.arbitrary.pub,
      oldEncryptedBrainKey: state => state.encryptedBrainKey,
      needSyncAccount: state => state.needSyncAccount
    })
  },
  watch: {
    async brainKey() {
      if (this.brainKey && isValidBrainKey(this.brainKey)) {
        const keys = await brainKeyToKeys(this.brainKey);
        this.publicKey = keys.arbitrary.pub;
        const profile = await getUserProfile(keys.arbitrary.pub);
        if (profile && profile.displayName) {
          this.displayName = profile.displayName;
        }
      }
    }
  },
  methods: {
    async reset() {
      this.publicKey = "";
      this.displayName = "";
      this.password = "";
      this.brainKey = "";
      this.waiting = false;
    },
    async walletConnected({ connector, auth }) {
      this.walletError = "";
      try {
        const sig = await connector.getAuthorizeSignature();
        const hash = ecc.sha256(sig);
        this.brainKey = await brainKeyFromHash(hash);
        this.displayName = auth.accountName;
      } catch (ex) {
        this.walletError = ex.message;
        this.$refs.connector.logout();
      }
    },
    async login() {
      this.$refs.form.validate();

      if (this.passwordRules.length) return;

      let login = undefined;

      if (!this.hasLoginSession) {
        if (this.brainKeyRules.length) return;
        if (this.displayNameRules.length) return;

        login = await createLoginObject({
          brainKey: this.brainKey,
          password: this.password,
          displayName: this.displayName
        });
      } else {
        if (this.passwordTesterRules.length) return;

        login = await createLoginObject({
          brainKey: decrypt(this.oldEncryptedBrainKey, this.password),
          password: this.password,
          displayName: this.oldDisplayName
        });
      }

      this.waiting = true;
      this.$store.commit("login", login);
      await sleep(500);
      await waitFor(async () => !this.needSyncAccount);
      this.$store.commit("setLoginDialogOpen", false);
      await this.reset();
    }
  }
};
</script>