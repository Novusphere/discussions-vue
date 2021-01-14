<template>
  <div>
    <v-row :align="'center'" :justify="'center'">
      <v-col>
        <v-menu offset-y v-for="(wn) in eosWallets" :key="wn">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              class="mr-2 mb-2"
              style="min-width: 150px"
              :block="$vuetify.breakpoint.mobile"
              color="lightgray"
              text
              outlined
              v-bind="attrs"
              v-on="on"
              :disabled="waiting"
            >
              <v-progress-circular
                class="mr-2"
                indeterminate
                v-show="waiting"
              ></v-progress-circular>
              <img
                v-show="!waiting"
                class="mr-1"
                :src="`/static/wallet/${wn}.png`"
                style="width: 24px; height: 24px"
              />
              {{ wn }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="(item, index) in ['EOS', 'TLOS']"
              :key="index"
              @click="connect(wn, item)"
            >
              <TokenIcon :symbol="item"></TokenIcon>
              <span class="ml-1 text-uppercase">{{ item }}</span>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          class="mr-2 mb-2"
          v-for="(wn, i) in ethWallets"
          :key="i"
          style="min-width: 150px"
          :block="$vuetify.breakpoint.mobile"
          color="lightgray"
          text
          outlined
          @click="connect(wn, 'eth')"
          :disabled="waiting"
        >
          <v-progress-circular
            class="mr-2"
            indeterminate
            v-show="waiting"
          ></v-progress-circular>
          <img
            v-show="!waiting"
            class="mr-1"
            :src="`/static/wallet/${wn}.png`"
            style="width: 24px; height: 24px"
          />
          {{ wn }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { eos, eth, connectWallet, getToken } from "@/novusphere-js/uid";
import { sleep } from "@/novusphere-js/utility";
import TokenIcon from "@/components/TokenIcon";

export default {
  name: "ConnectWalletCard",
  components: {
    TokenIcon,
  },
  props: {
    noEos: Boolean,
    noEth: Boolean,
  },
  data: () => ({
    waiting: false,
    hasWallet: false,
    chain: '',
    eosWallets: [],
    ethWallets: [],
  }),
  created() {
    this.eosWallets = [];
    this.ethWallets = [];

    if (!this.noEos) this.eosWallets.push(...eos.getWalletNames());
    if (!this.noEth) this.ethWallets.push(...eth.getWalletNames());

    this.wallet = undefined;
  },
  methods: {
    async getAuthorizeSignature() {
      const wallet = this.wallet;
      if (wallet.provider.id == "anchor-link") {
        await sleep(1500);

        const { signatures } = await wallet.provider.link.identify(
          {
            actor: wallet.auth.accountName,
            permission: wallet.auth.permission,
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
    async connect(wn, symbol) {
      this.waiting = true;
      try {
        this.$emit("start-connect");
        const token = await getToken(symbol);
        const wallet = await connectWallet(wn, token.chain);
        if (wallet) {
          this.hasWallet = true;
          this.wallet = wallet;
          this.chain = token.chain;
          this.waiting = false;
          this.$emit("connected", { connector: this, auth: this.wallet.auth });
        }
      } catch (ex) {
        this.hasWallet = false;
        this.wallet = undefined;
        this.waiting = false;
        this.$emit("error", ex);
      }
    },
  },
};
</script>