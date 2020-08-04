<template>
  <v-card flat tile>
    <v-form ref="form" lazy-validation @submit.prevent>
      <v-expansion-panels class="mt-2" flat tile v-model="panel">
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
      </v-expansion-panels>
    </v-form>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="$store.commit('setLoginDialogOpen', false)">Close</v-btn>
      <v-btn :disabled="waiting || !nextStepOK" color="primary" @click="nextStep()">
        <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>
        <span>{{ panel == 2 ? 'Finish' : 'Next' }}</span>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import {
  createLoginObject,
  displayNameRules,
  passwordRules,
  brainKeyRules,
} from "@/utility";
import { generateBrainKey } from "@/novusphere-js/uid";
import { sleep, waitFor } from "@/novusphere-js/utility";

export default {
  name: "SignupCard",
  components: {},
  props: {},
  computed: {
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
      }
      return false;
    },
  },
  data: () => ({
    waiting: false,
    panel: 0,
    brainKey: "",
    generatedBrainKey: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  }),
  methods: {
    async generateBrainKey() {
      this.generatedBrainKey = generateBrainKey();
    },
    async reset() {
      this.waiting = false;
      this.panel = 0;
      this.generatedBrainKey = "";
      this.displayName = "";
      this.password = "";
      this.confirmPassword = "";
      this.$refs.form.resetValidation();
    },
    async nextStep() {
      if (!this.nextStepOK) return;
      if (this.panel < 2) {
        this.panel = this.panel + 1;
      } else if (this.panel == 2) {
        await this.completeSignup();
      } else {
        // should never happen
        this.panel = 0;
      }
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
      await waitFor(async () => !this.needSyncAccount);
      this.$store.commit("setLoginDialogOpen", false);
      await this.reset();
    },
  },
};
</script>