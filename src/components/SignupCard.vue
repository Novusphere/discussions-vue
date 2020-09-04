<template>
  <v-card flat tile>
    <v-card-text :class="{ 'dark': darkMode, 'light': !darkMode }">
      <v-form ref="form" lazy-validation @submit.prevent class="signup scrollable">
        <v-expansion-panels class="mt-2" flat tile readonly v-model="panel">
          <v-expansion-panel>
            <v-expansion-panel-header>1. Set up display name and password</v-expansion-panel-header>
            <v-expansion-panel-content>
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
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="confirmPassword"
                    :rules="confirmPasswordRules"
                    label="Confirm Password"
                    type="password"
                    required
                    @keydown.enter="nextStep()"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>2. Generate brain key mnemonic</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-row>
                <v-col cols="12">
                  <v-textarea v-model="generatedBrainKey" label="Brain Key Mnemonic" required>
                    <template v-slot:append>
                      <v-btn icon @click="$copyText(generatedBrainKey)">
                        <v-icon>content_copy</v-icon>
                      </v-btn>
                    </template>
                  </v-textarea>
                  <div class="red--text text-center">
                    <span>
                      It's
                      <strong>VERY</strong> important you save your brain key. It cannot be recovered after sign up!
                    </span>
                  </div>
                  <v-btn color="primary" @click="generateBrainKey()">Generate</v-btn>
                </v-col>
              </v-row>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>3. Verify your brain key mnemonic</v-expansion-panel-header>
            <v-expansion-panel-content>
              <v-textarea
                v-model="brainKey"
                :rules="brainKeyRules2"
                label="Brain Key Mnemonic"
                required
              ></v-textarea>
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>4. Connect your social media</v-expansion-panel-header>
            <v-expansion-panel-content>
              <SocialMediasCard
                flat
                :isMyProfile="true"
                :auth="auth"
                @update="(newAuth) => auth = newAuth"
              />
            </v-expansion-panel-content>
          </v-expansion-panel>
          <v-expansion-panel>
            <v-expansion-panel-header>5. Join communities</v-expansion-panel-header>
            <v-expansion-panel-content>
              <DiscoverCommunityPage dense no-view />
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="accent" @click="testFill()" v-if="false">Test</v-btn>
      <v-btn color="primary" @click="$store.commit('setLoginDialogOpen', false)">Close</v-btn>
      <v-btn :disabled="waiting || !nextStepOK" color="primary" @click="nextStep()">
        <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>
        <span>{{ nextText }}</span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import {
  createLoginObject,
  displayNameRules,
  passwordRules,
  brainKeyRules,
} from "@/utility";
import { generateBrainKey } from "@/novusphere-js/uid";
import { sleep, waitFor } from "@/novusphere-js/utility";
import DiscoverCommunityPage from "@/pages/discover/DiscoverCommunityPage";
import SocialMediasCard from "@/components/SocialMediasCard";

export default {
  name: "SignupCard",
  components: {
    DiscoverCommunityPage,
    SocialMediasCard,
  },
  props: {},
  computed: {
    ...mapGetters(["isLoggedIn", "saveAccount"]),
    ...mapState({
      isLoginDialogOpen: (state) => state.isLoginDialogOpen,
      darkMode: (state) => state.darkMode,
    }),
    ...brainKeyRules("brainKey"),
    brainKeyRules2() {
      const rules = [];
      if (this.brainKey.trim() != this.generatedBrainKey) {
        rules.push(`Entered brain key does not match generated brain key`);
      }
      rules.push(...this.brainKeyRules);
      return rules;
    },
    ...displayNameRules("displayName"),
    ...passwordRules("password"),
    confirmPasswordRules() {
      const rules = [];
      if (this.password != this.confirmPassword) {
        rules.push(`Passwords do not match`);
      }
      return rules;
    },
    nextStepOK() {
      if (this.panel == 0) {
        if (this.displayNameRules.length) return false;
        if (this.passwordRules.length) return false;
        if (this.confirmPasswordRules.length) return false;
        return true;
      } else if (this.panel == 1) {
        if (!this.generatedBrainKey) return false;
        return true;
      } else if (this.panel == 2) {
        if (this.brainKeyRules2.length) return false;
        return true;
      } else if (this.panel >= 3) {
        // optional steps
        return true;
      }
      return false;
    },
    nextText() {
      if (this.panel == 4) return 'Finish';
      else if (this.panel > 2) return 'Next / Skip';
      else return 'Next';
    }
  },
  data: () => ({
    auth: [],
    waiting: false,
    panel: 0,
    brainKey: "",
    generatedBrainKey: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  }),
  watch: {
    async isLoginDialogOpen() {
      await this.reset();
    },
  },
  created() {},
  methods: {
    testFill() {
      const bk =
        "lucky visa hover catalog palm shoulder genuine once west panel order excite";

      this.brainKey = bk;
      this.generatedBrainKey = bk;
      this.displayName = "tester";
      this.password = "tester";
      this.confirmPassword = "tester";
    },
    async generateBrainKey() {
      this.generatedBrainKey = generateBrainKey();
    },
    async reset() {
      this.waiting = false;
      this.auth = [];
      this.panel = 0;
      this.generatedBrainKey = "";
      this.displayName = "";
      this.password = "";
      this.confirmPassword = "";
      this.$refs.form.resetValidation();
    },
    async nextStep() {
      if (!this.nextStepOK) return;

      if (this.panel < 2) this.panel = this.panel + 1;
      else if (this.panel == 2) await this.completeSignup();
      else if (this.panel == 3) this.panel = this.panel + 1;
      else if (this.panel == 4) {
        // close dialog we're done
        this.$store.commit("setLoginDialogOpen", false);
        await this.reset();
      } else this.panel = 0;
    },
    async completeSignup() {
      if (
        this.displayNameRules.length ||
        this.passwordRules.length ||
        this.confirmPasswordRules.length
      ) {
        this.panel = 0;
        return;
      }

      if (!this.generatedBrainKey) {
        this.panel = 1;
        return;
      }

      if (this.brainKeyRules2.length) {
        this.panel = 2;
        return;
      }

      let login = await createLoginObject({
        brainKey: this.brainKey,
        password: this.password,
        displayName: this.displayName,
      });

      this.waiting = true;
      this.$store.commit("login", login);
      await sleep(500);
      await waitFor(async () => !this.needSyncAccount && this.isLoggedIn);
      //this.$store.commit("setLoginDialogOpen", false);
      //await this.reset();

      await this.saveAccount();

      this.waiting = false;
      this.panel = 3; //
    },
  },
};
</script>

<style scoped lang="scss">
.signup {
  max-height: 500px;
  overflow-y: scroll;
}
</style>