<template>
  <v-card>
    <v-card-text>
      <v-row no-gutters v-if="!this.$vuetify.breakpoint.mobile">
        <v-col :cols="1">
          <TokenIcon v-if="token" :size="64" :symbol="token.symbol" />
        </v-col>
        <v-col :cols="2">
          <span class="d-block">{{ time.toLocaleDateString() }}</span>
          <span class="d-block">{{ time.toLocaleTimeString() }}</span>
          <span class="d-block">{{ isReceived ? "Receive" : "Sent" }}</span>
        </v-col>
        <v-col :cols="7">
          <strong class="d-block">Memo</strong>
          <span class="d-block" v-html="memoHtml"></span>
        </v-col>
        <v-col>
          <span class="d-block">{{ isReceived ? "+" : "-" }} {{ total }}</span>
          <div class="d-block">
            <TransactionLink :chain="symbol" :transaction="trx.transaction">
              <v-icon>zoom_in</v-icon>On Chain
            </TransactionLink>
          </div>
        </v-col>
      </v-row>
      <v-row v-else>
        <v-col :cols="3">
          <TokenIcon v-if="token" :size="64" :symbol="token.symbol" />
          <p class="text-center">
            <span class="d-block">{{ shortTime(time) }}</span>
            <span class="d-block">{{ isReceived ? "Recevie" : "Sent" }}</span>
          </p>
        </v-col>
        <v-col :cols="4">
          <span class="d-block" v-html="memoHtml"></span>
        </v-col>
        <v-col>
          <span class="d-block">{{ isReceived ? "+" : "-" }} {{ total }}</span>
          <div class="d-block">
            <TransactionLink :chain="symbol" :transaction="trx.transaction">
              <v-icon>zoom_in</v-icon>On Chain
            </TransactionLink>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
import { sanitize } from "@/novusphere-js/utility";
import { getToken, sumAsset } from "@/novusphere-js/uid";

import { shortTimeMixin } from "@/mixins/shortTime";

import TokenIcon from "@/components/TokenIcon";
import TransactionLink from "@/components/TransactionLink";

export default {
  name: "TransactionCard",
  mixins: [shortTimeMixin],
  components: {
    TokenIcon,
    TransactionLink,
  },
  props: {
    trx: Object,
  },
  watch: {},
  computed: {
    ...mapState({
      keys: (state) => state.keys,
    }),
    isSent() {
      return this.trx.data.from == this.keys.wallet.pub;
    },
    isReceived() {
      const uidw = this.keys.wallet.pub;
      return this.trx.data.to == uidw || this.trx.data.memo == uidw;
    },
  },
  data: () => ({
    token: null,
    total: "",
    symbol: "",
    memoHtml: "",
    time: new Date(0),
  }),
  async created() {
    this.time = new Date(this.trx.time);

    if (this.trx.data.quantity) {
      this.total = this.trx.data.quantity;

      if (this.trx.data.from == "atmosstakerw") {
        this.memoHtml = `ATMOS staking reward. Thank you!`;
      } else {
        this.memoHtml = `Deposit from ${this.trx.data.from}`;
      }
    } else {
      if (this.isReceived) this.total = this.trx.data.amount;
      else this.total = await sumAsset(this.trx.data.amount, this.trx.data.fee);

      if (this.trx.data.to == "EOS1111111111111111111111111111111114T1Anm") {
        let to = this.trx.data.memo;
        let colon = to.indexOf(":");
        if (colon > -1) {
          const message = to.substring(colon + 1);
          this.memoHtml =
            `Withdraw to ${to.substring(0, colon)}` +
            (message ? ` - ${message}` : ``);
        } else {
          this.memoHtml = `Withdraw to ${to}`;
        }
      } else {
        let memo = this.trx.data.memo;

        // 11/10/2020 -- memo field in data is deprecated, memo may be stored in metadata
        if (!memo) {
          try {
            memo = this.trx.data.metadata.memo || "";
          } catch (ex) {
            // pass
          }
        }

        let memoHtml = sanitize(memo);

        memoHtml = memoHtml.replace(/\/tag\/[a-zA-Z0-9/_-]+/, function (url) {
          return `<a target="_blank" href="${url}">${url}</a>`;
        });

        memoHtml = memoHtml.replace(
          /\/u\/[a-zA-Z0-9/_-]+-[a-zA-Z0-9]+/,
          function (url) {
            return `<a target="_blank" href="${url}">${url}</a>`;
          }
        );

        this.memoHtml = memoHtml;
      }
    }

    if (this.total) {
      const [, symbol] = this.total.split(" ");
      this.symbol = symbol;
      this.token = await getToken(this.symbol);
    }
  },
  methods: {},
};
</script>
