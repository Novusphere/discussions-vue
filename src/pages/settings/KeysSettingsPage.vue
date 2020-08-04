<template>
  <div>
    <v-card>
      <v-card-text>
        <v-row>
          <v-col :cols="6" v-for="(tf, i) in textFields" :key="i">
            <v-text-field :label="tf.name" :value="tf.value" readonly>
              <template v-slot:append>
                <v-btn icon @click="$copyText(tf.value)">
                  <v-icon>content_copy</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </v-col>
          <v-col :cols="12">
            <v-text-field label="Brain Key" :value="brainKey" readonly>
              <template v-slot:append>
                <v-btn icon @click="$copyText(brainKey)">
                  <v-icon>content_copy</v-icon>
                </v-btn>
              </template>
            </v-text-field>
          </v-col>
        </v-row>

        <v-row>
          <v-col :cols="12">
            <v-form ref="form" lazy-validation>
              <v-text-field
                v-model="password"
                :rules="passwordTesterRules"
                label="Password"
                type="password"
                required
                @keydown.enter="reveal()"
              ></v-text-field>
            </v-form>
          </v-col>
          <v-col :cols="12">
            <v-btn color="primary" @click="reveal()">Reveal Private Keys</v-btn>
          </v-col>
          <v-col :cols="12">
            <p class="text-center red--text">
              Enter your password to reveal your private keys, which are used to make posts, manage your account and transfer tokens.
              Please be cautious when accessing this page in areas where others can easily see your screen.
            </p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { passwordTesterRules } from "@/utility";
import { decrypt, brainKeyToKeys } from "@/novusphere-js/uid";

export default {
  name: "KeysSettingsPage",
  components: {},
  props: {},
  computed: {
    ...passwordTesterRules("password", "encryptedTest"),
    ...mapState({
      keys: (state) => state.keys,
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      encryptedTest: (state) => state.encryptedTest,
    }),
  },
  data: () => ({
    brainKey: "",
    password: "",
    textFields: [],
  }),
  created() {
    this.reveal();
  },
  methods: {
    async reveal() {
      let privateKeys = ["", "", ""];
      this.brainKey = "";

      if (this.passwordTesterRules.length == 0) {
        const brainKey = decrypt(this.encryptedBrainKey, this.password);
        const keys = await brainKeyToKeys(brainKey);

        this.brainKey = brainKey;
        privateKeys = [keys.arbitrary.key, keys.wallet.key, keys.identity.key];
      }

      this.textFields = [
        { name: "Post Key", value: this.keys.arbitrary.pub },
        { name: "", value: privateKeys[0] },
        { name: "Wallet Key", value: this.keys.wallet.pub },
        { name: "", value: privateKeys[1] },
        { name: "Identity Key", value: this.keys.identity.pub },
        { name: "", value: privateKeys[2] },
      ];

      this.password = "";
      this.$refs.form.resetValidation();
    },
  },
};
</script>