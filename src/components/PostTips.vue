<template>
  <div>
    <div v-for="(tip, i) in tips" :key="i" class="d-inline-block mr-1">
      <v-chip small outlined color="primary" @click="openCommunity(tip.symbol)">
        <TokenIcon class="mr-1" :symbol="tip.symbol" />
        <span
          :class="{ 'tip-text': true, 'mobile-tip-text': $vuetify.breakpoint.mobile }"
        >{{ formatTip(tip) }}</span>
      </v-chip>
    </div>
  </div>
</template>


<script>
import TokenIcon from "@/components/TokenIcon";
import { getCommunities } from "@/novusphere-js/discussions/api";
import { sleep } from "@/novusphere-js/utility";

export default {
  name: "PostTips",
  components: {
    TokenIcon,
  },
  props: {
    post: Object,
  },
  computed: {
    tips() {
      /*let summary = {
        EOS: 1.234,
        MPT: 2.234,
        VIG: 3.111,
        BOID: 4.222,
        KROWN: 555,
        PUML: 123.456
      };*/
      //console.log(JSON.parse(JSON.stringify(this.post.tips)));

      let summary = {};
      for (const tip of this.post.tips) {
        const [amount, symbol] = tip.data.amount.split(" ");
        const [fee] = tip.data.fee.split(" ");
        summary[symbol] =
          (summary[symbol] || 0) + (Number(amount) + Number(fee));
      }
      return Object.keys(summary).map((k) => ({
        symbol: k,
        amount: summary[k],
      }));
    },
  },
  data: () => ({
    //
  }),
  methods: {
    async openCommunity(symbol) {
      const rect = this.$el.getBoundingClientRect();
      const communities = await getCommunities();
      const community = communities.find((c) => c.symbol == symbol);
      if (community) {
        await sleep(100); // incase there's another popover open
        this.$store.commit("setPopoverOpen", {
          value: true,
          type: "tag",
          rect,
          community,
        });
      }
    },
    formatTip(tip) {
      const formatted = Number(tip.amount.toFixed(4)).toString();
      return formatted;
    },
  },
};
</script>

<style scoped>
.tip-text {
  letter-spacing: 0px;
}

.mobile-tip-text {
  font-size: 8px;
}
</style>