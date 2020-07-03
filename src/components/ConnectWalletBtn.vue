<template>
  <div class="d-inline-block" :class="{ 'v-btn--block': $attrs.block }">
    <v-menu offset-y v-if="!hasWallet">
      <template v-slot:activator="{ on }">
        <v-btn v-bind="$attrs" v-on="on" :disabled="waiting">
          <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>
          <span>Connect Wallet</span>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(wn, i) in walletNames" :key="i">
          <v-btn text @click="connect(wn)">{{ wn }}</v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
    <div v-else>
      <slot name="action"></slot>
      <slot name="disconnect" :logout="logout"></slot>
    </div>
  </div>
</template>

<script>
import { eos } from "@/novusphere-js/uid";

export default {
  name: "ConnectWalletBtn",
  components: {},
  props: {},
  data: () => ({
    waiting: false,
    hasWallet: false,
    walletNames: []
  }),
  created() {
    this.wallet = undefined;
    this.walletNames = eos.getWalletNames();
  },
  methods: {
    async logout() {
      if (this.wallet) {

        try {
          await this.wallet.logout(this.wallet.auth.accountName, this.wallet.auth.permission);
        } catch (ex) {
          console.log(ex);
        }

        this.wallet = undefined;
        this.hasWallet = false;
      }
    },
    async connect(wn) {
      this.waiting = true;
      try {
        const wallet = await eos.connectWallet(wn);
        if (wallet) {
          this.hasWallet = true;
          this.wallet = wallet;
          this.waiting = false;
        }
      } catch (ex) {
        this.waiting = false;
        this.$emit("error", ex);
      }
    }
  }
};
</script>