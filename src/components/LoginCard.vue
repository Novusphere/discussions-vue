<template>
  <v-card>
    <v-card-title>
      <span class="headline">Sign in</span>
    </v-card-title>
    <v-card-text>
      <v-container>
        <v-form ref="form">
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
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="displayName"
                  :rules="displayNameRules"
                  label="Display Name"
                  required
                ></v-text-field>
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
                :rules="passwordRules"
                label="Password"
                type="password"
                required
              ></v-text-field>
            </v-col>
          </v-row>
        </v-form>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn text @click="$store.commit('setLoginDialogOpen', false)">Close</v-btn>
      <v-btn text @click="login()">Log in</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import PublicKeyIcon from "@/components/PublicKeyIcon";
import {
  decrypt,
  encrypt,
  isValidBrainKey,
  brainKeyToKeys
} from "@/novusphere-js/uid";

export default {
  name: "LoginCard",
  components: {
    PublicKeyIcon
  },
  props: {},
  data: () => ({
    brainKey: "",
    displayName: "",
    password: ""
  }),
  computed: {
    // TO-DO: rules for display name, password
    brainKeyRules() {
      const rules = [];
      if (!isValidBrainKey(this.brainKey)) {
        rules.push(`Invalid brain key mnemonic`);
      }
      return rules;
    },
    displayNameRules() {
      const rules = [];
      if (this.displayName.length < 3) {
        rules.push(`Display name must be at least 3 characters`);
      }
      if (this.displayName.length > 16) {
        rules.push(`Display names can be at most 16 characters`);
      }
      return rules;
    },
    passwordRules() {
      const rules = [];
      if (this.hasLoginSession) {
        if (decrypt(this.oldEncryptedTest, this.password) != "test") {
          rules.push(`Password is incorrect`);
        }
      } else {
        if (this.password.length < 5) {
          rules.push(`Password must be at least 5 characters`);
        }
      }
      return rules;
    },
    ...mapGetters(["hasLoginSession"]),
    ...mapState({
      oldEncryptedTest: state => state.encryptedTest,
      oldDisplayName: state => state.displayName,
      oldPublicKey: state => state.keys.arbitrary.pub,
      oldEncryptedBrainKey: state => state.encryptedBrainKey
    })
  },
  methods: {
    async reset() {
      this.displayName = "";
      this.password = "";
      this.brainKey = "";
    },
    async login() {
      this.$refs.form.validate();

      if (this.passwordRules.length) return;

      let login = undefined;

      if (!this.hasLoginSession) {
        if (this.brainKeyRules.length) return;
        if (this.displayNameRules.length) return;

        const keys = await brainKeyToKeys(this.brainKey);

        login = {
          encryptedBrainKey: encrypt(this.brainKey, this.password),
          encryptedTest: encrypt("test", this.password),
          displayName: this.displayName,
          keys: keys
        };
      } else {
        const keys = await brainKeyToKeys(
          decrypt(this.oldEncryptedBrainKey, this.password)
        );
        login = {
          encryptedBrainKey: this.oldEncryptedBrainKey,
          encryptedTest: this.oldEncryptedTest,
          displayName: this.oldDisplayName,
          keys: keys
        };
      }

      if (login) {
        this.$store.commit("login", login);
        await this.reset();
      }
    }
  }
};
</script>