<template>
  <div>
    <v-card flat tile v-if="!lastOAuth">
      <v-card-text>
        <v-container>
          <v-form ref="form" v-model="validForm" @submit.prevent="login()">
            <div v-if="!hasLoginSession">
              <v-row>
                <v-col cols="12">
                  <v-textarea
                    v-model="brainKey"
                    :rules="brainKeyRules"
                    label="Brain Key Mnemonic"
                    hint="Enter your brain key mnemonic"
                    required
                  ></v-textarea>
                  <div>
                    <div class="text-center mb-2">OR</div>
                    <ConnectWalletBtn
                      class="mb-2"
                      ref="connector"
                      color="primary"
                      outlined
                      @start-connect="walletError = ''"
                      @connected="walletConnected"
                      @error="(e) => (walletError = e)"
                    >
                      <template v-slot:disconnect="{ logout }">
                        <v-btn color="error" outlined block @click="logout"
                          >Disconnect Wallet</v-btn
                        >
                      </template>
                    </ConnectWalletBtn>

                    <v-btn block outlined @click="socialLogin('twitter')"
                      ><v-icon class="mr-2">mdi-twitter</v-icon> Twitter</v-btn
                    >
                  </div>

                  <div class="text-center" v-show="walletError">
                    <span class="error--text">{{ walletError }}</span>
                  </div>
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
                    <v-btn
                      icon
                      class="ml-3 mb-3"
                      @click="$store.commit('forgetLoginSession')"
                    >
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
        <v-btn
          color="primary"
          @click="$store.commit('setLoginDialogOpen', false)"
          >Close</v-btn
        >
        <v-btn
          :disabled="waiting || !validForm"
          color="primary"
          @click="login()"
        >
          <v-progress-circular
            class="mr-2"
            indeterminate
            v-show="waiting"
          ></v-progress-circular>
          <span>Log in</span>
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-card flat tile v-else-if="lastOAuth.identities.length == 0">
      <v-card-text>
        <v-form @submit.prevent>
          <v-text-field
            v-model="displayName"
            :rules="displayNameRules"
            label="Display Name"
            required
          >
          </v-text-field>

          <v-text-field
            v-model="password"
            autocomplete="off"
            label="Password"
            type="password"
            :rules="passwordRules"
          />
          <v-text-field
            v-model="confirmPassword"
            autocomplete="off"
            label="Confirm Password"
            type="password"
            :rules="confirmPasswordRules"
          />

          <v-btn
            :disabled="waiting"
            rounded
            block
            color="primary"
            @click="finishOAuthSignup"
          >
            <v-progress-circular v-if="waiting" class="mr-2" indeterminate />
            <span>Finish</span>
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
    <v-card flat tile v-else-if="lastOAuth.identities.length > 0">
      <v-card-text>
        <v-form @submit.prevent>
          <v-radio-group v-model="selectedIdentity">
            <v-radio
              v-for="(user, i) in lastOAuth.identities"
              :key="user.pub"
              :label="user.displayName"
              :value="i"
            />
          </v-radio-group>
          <v-text-field
            v-model="password"
            autocomplete="off"
            label="Password"
            type="password"
            :error-messages="passwordErrors"
            @keydown.enter="completeOAuthLogin"
          />
        </v-form>
        <v-row>
          <v-col :cols="6">
            <v-btn
              class="mt-2"
              rounded
              color="primary"
              block
              @click="lastOAuth = null"
            >
              Back
            </v-btn>
          </v-col>
          <v-col :cols="6">
            <v-btn
              :disabled="waiting"
              class="mt-2"
              rounded
              color="primary"
              block
              @click="completeOAuthLogin"
            >
              <v-progress-circular v-if="waiting" class="mr-2" indeterminate />
              Next
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import ecc from "eosjs-ecc";
import {
  createLoginObject,
  displayNameRules,
  passwordRules,
  passwordTesterRules,
  brainKeyRules,
} from "@/utility";
import PublicKeyIcon from "@/components/PublicKeyIcon";
import ConnectWalletBtn from "@/components/ConnectWalletBtn";
import {
  getUserProfile,
  linkExternalToUser,
  connectOAuth,
  grantOAuth,
} from "@/novusphere-js/discussions/api";
import {
  decrypt,
  brainKeyFromHash,
  isValidBrainKey,
  brainKeyToKeys,
  generateBrainKey,
} from "@/novusphere-js/uid";
import { sleep, waitFor } from "@/novusphere-js/utility";

export default {
  name: "LoginCard",
  components: {
    PublicKeyIcon,
    ConnectWalletBtn,
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
    validForm: false,
    lastWalletData: null, // { chain, address }
    // ---
    lastOAuth: null,
    selectedIdentity: 0,
    passwordErrors: [],
    confirmPassword: "",
  }),
  computed: {
    ...brainKeyRules("brainKey"),
    ...displayNameRules("displayName"),
    ...passwordRules("password"),
    ...passwordTesterRules("password", "oldEncryptedTest"),
    confirmPasswordRules() {
      const rules = [];
      if (this.password != this.confirmPassword) {
        rules.push(`Passwords do not match`);
      }
      return rules;
    },
    passwordRules2() {
      const rules = [];
      if (this.hasLoginSession) {
        rules.push(...this.passwordTesterRules);
      } else {
        rules.push(...this.passwordRules);
      }
      return rules;
    },
    ...mapGetters(["hasLoginSession", "isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
      oldEncryptedTest: (state) => state.encryptedTest,
      oldDisplayName: (state) => state.displayName,
      oldPublicKey: (state) => state.keys.arbitrary.pub,
      oldEncryptedBrainKey: (state) => state.encryptedBrainKey,
      needSyncAccount: (state) => state.needSyncAccount,
    }),
  },
  watch: {
    async isLoggedIn() {
      if (!this.isLoggedIn || !this.keys) return;

      console.log(`Logged in as ${this.keys.arbitrary.pub}`);

      // grant this oauth future access to easy login
      if (this.lastOAuth) {
        const oauth = this.lastOAuth;
        const ak = this.keys.arbitrary.key;
        setTimeout(async () => {
          console.log("Grant oauth");
          await grantOAuth(ak, oauth.provider, oauth.id);
        }, 10000);
        this.lastOAuth = null;
      }

      if (this.lastWalletData) {
        console.log("Link external to user", {
          chain: this.lastWalletData.chain,
          address: this.lastWalletData.address,
        });
        await linkExternalToUser(
          this.keys.identity.key,
          this.lastWalletData.chain,
          this.lastWalletData.address
        );
      }
    },
    async brainKey() {
      if (this.brainKey && isValidBrainKey(this.brainKey)) {
        const keys = await brainKeyToKeys(this.brainKey);
        this.publicKey = keys.arbitrary.pub;
        const profile = await getUserProfile(keys.arbitrary.pub);
        if (profile && profile.displayName) {
          this.displayName = profile.displayName;
        }
      }
    },
  },
  methods: {
    async finishOAuthSignup() {
      if (this.passwordRules.length) return;
      if (this.displayNameRules.length) return;

      const brainKey = generateBrainKey();
      this.brainKey = brainKey;

      await this.login();
    },
    async completeOAuthLogin() {
      try {
        const { displayName, encryptedBrainKey } = this.lastOAuth.identities[
          this.selectedIdentity
        ];
        const brainKey = decrypt(encryptedBrainKey, this.password);
        if (!isValidBrainKey(brainKey)) throw new Error();
        this.brainKey = brainKey;
        this.displayName = displayName;
      } catch (ex) {
        this.passwordErrors = ["Invalid password!"];
        return;
      }
      await this.login();
    },
    async socialLogin(provider) {
      window.closePageCallback = async ({ provider, id, pubs }) => {
        //console.log(provider, id);
        //console.log(pubs.split(","));

        const identities = [];
        for (const pub of pubs.split(",")) {
          if (!pub) continue;

          const profile = await getUserProfile(pub);
          //console.log(profile);

          if (!profile.encryptedBrainKey) continue;
          identities.push({
            pub,
            displayName: profile.displayName,
            encryptedBrainKey: profile.encryptedBrainKey,
          });
        }
        this.passwordErrors = [];
        this.lastOAuth = { provider, id, identities };
      };

      const callback = `${window.location.protocol}//${window.location.host}/close`;
      await connectOAuth("", provider, callback);
    },
    async reset() {
      this.publicKey = "";
      this.displayName = "";
      this.password = "";
      this.brainKey = "";
      this.waiting = false;
      //this.lastOAuth = null;
      this.passwordErrors = [];
      this.selectedIdentity = 0;
      this.confirmPassword = "";
      if (this.$refs.form) this.$refs.form.resetValidation();
    },
    async walletConnected({ connector, auth }) {
      this.walletError = "";
      try {
        const sig = await connector.getAuthorizeSignature();
        const hash = ecc.sha256(sig);
        this.brainKey = await brainKeyFromHash(hash);
        this.displayName = auth.accountName;

        const keys = await brainKeyToKeys(this.brainKey);

        if (connector.chain == "eos" || connector.chain == "telos") {
          this.lastWalletData = {
            chain: connector.chain,
            address: connector.wallet.auth.accountName,
          };
          await linkExternalToUser(
            keys.identity.key,
            this.lastWalletData.chain,
            this.lastWalletData.address
          );
        }
      } catch (ex) {
        this.walletError = ex.message;
        this.$refs.connector.logout();
      }
    },
    async login() {
      if (this.$refs.form) this.$refs.form.validate();

      if (this.passwordRules.length) return;

      let login = undefined;

      if (!this.hasLoginSession) {
        if (this.brainKeyRules.length) return;
        if (this.displayNameRules.length) return;

        login = await createLoginObject({
          brainKey: this.brainKey,
          password: this.password,
          displayName: this.displayName,
        });
      } else {
        if (this.passwordTesterRules.length) return;

        login = await createLoginObject({
          brainKey: decrypt(this.oldEncryptedBrainKey, this.password),
          password: this.password,
          displayName: this.oldDisplayName,
        });
      }

      this.waiting = true;
      this.$store.commit("login", login);
      await sleep(150);
      await waitFor(async () => !this.needSyncAccount);
      this.$store.commit("setLoginDialogOpen", false);
      await this.reset();
    },
  },
};
</script>