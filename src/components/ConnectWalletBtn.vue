<template>
  <v-btn
    block
    v-if="!hasWallet && !connecting"
    v-bind="$attrs"
    @click="connecting = true"
  >
    <span>Connect Wallet</span>
  </v-btn>
  <div v-else>
    <ConnectWalletCard
      v-show="connecting"
      ref="connector"
      :no-eth="noEth"
      :no-eos="noEos"
      @start-connect="() => $emit('start-connect')"
      @connected="connected"
      @error="(args) => $emit('error', args)"
    />

    <slot v-if="!connecting" name="action"></slot>
    <slot v-if="!connecting" name="disconnect" :logout="logout"></slot>
  </div>
</template>

<script>
import ConnectWalletCard from "@/components/ConnectWalletCard";

export default {
  name: "ConnectWalletBtn",
  components: {
    ConnectWalletCard,
  },
  props: {
    noEos: Boolean,
    noEth: Boolean,
  },
  data: () => ({
    hasWallet: false,
    connecting: false,
  }),
  created() {},
  methods: {
    connected({ connector, auth }) {
      this.hasWallet = true;
      this.connecting = false;
      this.wallet = this.$refs.connector.wallet;

      this.$emit("connected", { connector, auth });
    },
    async logout() {
      this.connecting = false;
      this.hasWallet = false;
      this.wallet = undefined;

      this.$refs.connector.logout();
    },
  },
};
</script>