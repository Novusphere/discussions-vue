<template>
  <v-card>
    <v-card-text>
      <v-row no-gutters v-if="!this.$vuetify.breakpoint.mobile">
        <v-col :cols="1">
          <TokenIcon v-if="token" :size="64" :symbol="token.symbol" />
        </v-col>
        <v-col :cols="2">
          <strong class="d-block">Time</strong>
          <span class="d-block">{{ shortTime() }}</span>
          <span class="d-block">{{ isReceived ? 'Received' : 'Sent' }}</span>
        </v-col>
        <v-col :cols="7">
          <strong class="d-block">Memo</strong>
          <span class="d-block" v-html="memoHtml"></span>
        </v-col>
        <v-col>
          <span class="d-block">{{ isReceived ? '+' : '-' }} {{ total }}</span>
          <div class="d-block">
            <TransactionLink chain="eos" :transaction="trx.transaction">
              <v-icon>zoom_in</v-icon>On Chain
            </TransactionLink>
          </div>
        </v-col>
      </v-row>
      <v-row v-else>
        <v-col :cols="3">
          <TokenIcon v-if="token" :size="64" :symbol="token.symbol" />
          <p class="text-center">
            <span class="d-block">{{ shortTime() }}</span>
            <span class="d-block">{{ isReceived ? 'Received' : 'Sent' }}</span>
          </p>
        </v-col>
        <v-col :cols="4">
          <span class="d-block" v-html="memoHtml"></span>
        </v-col>
        <v-col>
          <span class="d-block">{{ isReceived ? '+' : '-' }} {{ total }}</span>
          <div class="d-block">
            <TransactionLink chain="eos" :transaction="trx.transaction">
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
import { formatDistance } from "date-fns";
import { sanitize } from "@/novusphere-js/utility";
import { getToken, getTokenForChain, sumAsset } from "@/novusphere-js/uid";
import TokenIcon from "@/components/TokenIcon";
import TransactionLink from "@/components/TransactionLink";

export default {
  name: "TransactionCard",
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
    memoHtml: "",
  }),
  async created() {
    if (this.trx.data.quantity) {
      const [, symbol] = this.trx.data.quantity.split(" ");
      this.token = await getToken(symbol);
      this.total = this.trx.data.quantity;

      if (this.trx.data.from == "atmosstakerw") {
        this.memoHtml = `ATMOS staking reward. Thank you!`;
      } else {
        this.memoHtml = `Deposit from ${this.trx.data.from}`;
      }
    } else {
      this.token = await getTokenForChain(this.trx.data.chain_id);

      if (this.isReceived) this.total = this.trx.data.amount;
      else this.total = await sumAsset(this.trx.data.amount, this.trx.data.fee);

      const memo = this.trx.data.memo;
      let memoHtml = sanitize(memo);
      memoHtml = memoHtml.replace(/\/tag\/[a-zA-Z0-9/_-]+/, function (url) {
        return `<a target="_blank" href="${url}">${url}</a>`;
      });

      this.memoHtml = memoHtml;
    }
  },
  methods: {
    shortTime() {
      const t = new Date(this.trx.time);
      if (!this.$vuetify.breakpoint.mobile)
        return formatDistance(t, new Date(), { addSuffix: true });
      else {
        const delta = Date.now() - t;
        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;

        let unit = (u, s) => {
          const n = Math.max(1, Math.ceil(delta / u));
          return `${n}${s}`;
        };

        if (delta < minute) return unit(second, `s`);
        else if (delta < hour) return unit(minute, `m`);
        else if (delta < day) return unit(hour, `h`);
        else return unit(day, `d`);
      }
    },
  },
};
</script>
