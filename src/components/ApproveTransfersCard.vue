<template>
  <v-card :flat="flat">
    <v-card-title>
      <span class="headline">Transfer</span>
    </v-card-title>
    <v-card-text>
      <v-container :class="{ 'approve-transfers-mobile': $vuetify.breakpoint.mobile }">
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

        <v-row v-show="!disableSubmit">
          <v-col cols="12">
            <v-text-field
              v-model="password"
              :rules="passwordTesterRules"
              label="Password"
              type="password"
              required
              @keydown.enter="submit()"
            ></v-text-field>
          </v-col>
        </v-row>

        <slot></slot>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="close()" v-show="closable">{{ closeText }}</v-btn>
      <v-btn color="primary" @click="submit()" :disabled="disableSubmit">
        <v-progress-circular class="mr-2" indeterminate v-if="disableSubmit"></v-progress-circular>Submit
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { passwordTesterRules } from "@/utility";
import TokenIcon from "@/components/TokenIcon";
import UserProfileLink from "@/components/UserProfileLink";
import { mapState } from "vuex";

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
    ...passwordTesterRules("password", "encryptedTest"),
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
      if (this.passwordTesterRules.length) return;

      const password = this.password;
      this.password = "";

      this.$emit("submit", password);
    }
  }
};
</script>

<style>
.approve-transfers-mobile {
  font-size: 10px;
}
</style>