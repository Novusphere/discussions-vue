<template>
  <div v-if="!list" class="d-inline-block" :class="{ 'v-btn--block': $attrs.block }">
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
  <div v-else>
    <p class="text-center" style="margin-bottom: 0px">OR</p>
    <v-row no-gutters :align="'center'" :justify="'center'">
      <v-col v-for="(wn, i) in walletNames" :key="i">
        <v-btn :block="$vuetify.breakpoint.mobile" color="lightgray" text outlined @click="connect(wn)" :disabled="waiting">
          <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>
          <img v-show="!waiting" class="mr-1" :src="`/static/wallet/${wn}.png`" style="width: 32px; height: 32px" />
          {{ wn }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { eos, eth, connectWallet } from "@/novusphere-js/uid";
import { sleep } from "@/novusphere-js/utility";

export default {
  name: "ConnectWalletBtn",
  components: {},
  props: {
    list: Boolean,
    noEos: Boolean,
    noEth: Boolean
  },
  data: () => ({
    waiting: false,
    hasWallet: false,
    walletNames: []
  }),
  created() {
    const walletNames = [];
    if (!this.noEos) walletNames.push(...eos.getWalletNames());
    if (!this.noEth) walletNames.push(...eth.getWalletNames());

    this.wallet = undefined;
    this.walletNames = walletNames;
  },
  methods: {
    async getAuthorizeSignature() {
      const wallet = this.wallet;
      if (wallet.provider.id == "anchor-link") {
        await sleep(1500);

        const { signatures } = await wallet.provider.link.identify(
          {
            actor: wallet.auth.accountName,
            permission: wallet.auth.permission
          },
          { key: wallet.auth.publicKey }
        );

        if (signatures && signatures.length > 0) return signatures[0];
        throw new Error(`No signature result`);
      } else {
        return await wallet.signArbitrary("discussions app auth");
      }
    },
    async logout() {
      if (this.wallet) {
        try {
          await this.wallet.logout(
            this.wallet.auth.accountName,
            this.wallet.auth.permission
          );
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
        this.$emit("start-connect");
        const wallet = await connectWallet(wn);
        if (wallet) {
          this.hasWallet = true;
          this.wallet = wallet;
          this.waiting = false;
          this.$emit("connected", { connector: this, auth: this.wallet.auth });
        }
      } catch (ex) {
        this.hasWallet = false;
        this.wallet = undefined;
        this.waiting = false;
        this.$emit("error", ex);
      }
    }
  }
};
</script>