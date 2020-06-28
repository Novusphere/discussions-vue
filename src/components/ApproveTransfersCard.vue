<template>
  <v-card :flat="flat">
    <v-card-title>
      <span class="headline">Transfer</span>
    </v-card-title>
    <v-card-text>
      <v-container>
        <v-row v-for="(t, i) in pendingTransfers" :key="i">
          <v-col cols="auto" v-if="!$vuetify.breakpoint.mobile">
            <UserProfileLink :publicKey="keys.arbitrary.pub" :displayName="displayName" />
          </v-col>
          <v-col cols="auto">
            <TokenIcon :symbol="t.symbol" />
            {{ t.total }}
          </v-col>
          <v-col cols="auto" v-if="!$vuetify.breakpoint.mobile">
            <v-icon>arrow_right_alt</v-icon>
          </v-col>
          <v-col cols="auto">
            <UserProfileLink :publicKey="t.recipient.pub" :displayName="t.recipient.displayName" />
          </v-col>
        </v-row>
        <v-form ref="form" lazy-validation v-show="!disableSubmit">
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
        <slot></slot>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="close()" v-show="closable">{{ closeText }}</v-btn>
      <v-btn color="primary" @click="submit()" :disabled="disableSubmit">
        <v-progress-circular class="mr-2" indeterminate v-if="disableSubmit"></v-progress-circular>
        Submit
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import TokenIcon from "@/components/TokenIcon";
import UserProfileLink from "@/components/UserProfileLink";
import { mapState } from "vuex";
import { decrypt } from "@/novusphere-js/uid";

export default {
  name: "ApproveTransfersCard",
  components: {
    TokenIcon,
    UserProfileLink
  },
  props: {
    disableSubmit: Boolean,
    pendingTransfers: Array,
    closable: Boolean,
    flat: Boolean,
    closeText: { type: String, default: "Close" }
  },
  data: () => ({
    password: ""
  }),
  computed: {
    passwordRules() {
      const rules = [];
      if (decrypt(this.encryptedTest, this.password) != "test") {
        rules.push("Incorrect password");
      }
      return rules;
    },
    ...mapState({
      keys: state => state.keys,
      displayName: state => state.displayName,
      encryptedTest: state => state.encryptedTest
    })
  },
  methods: {
    async close() {
      this.password = "";
      this.$emit("close");
    },
    async submit() {
      if (this.disableSubmit) return;
      
      this.$refs.form.validate();
      if (this.passwordRules.length) return;

      const password = this.password;
      this.password = "";

      this.$emit("submit", password);
    }
  }
};
</script>