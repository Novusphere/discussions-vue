<template>
  <div>
    <div v-for="(tip, i) in tips" :key="i" class="d-inline-block mt-1" :style="{ width: `${36 + formatTip(tip).length*6}px` }">
      <v-badge overlap>
        <template v-slot:badge>
          <span>{{ formatTip(tip) }}</span>
        </template>
        <TokenIcon :symbol="tip.symbol" />
      </v-badge>
    </div>
  </div>
</template>

<script>
import TokenIcon from "@/components/TokenIcon";

export default {
  name: "PostTips", 
  components: {
    TokenIcon
  },
  props: {
    post: Object
  },
  computed: {
    tips() {
      //let summary = { 'EOS': 1.234, 'MPT': 2.234, 'VIG': 3.111, 'BOID': 4.222, 'KROWN': 555, 'PUML': 123.456 };
      let summary = {};
      for (const tip of this.post.tips) {
        const [amount, symbol] = tip.data.amount.split(" ");
        const [fee] = tip.data.fee.split(" ");
        summary[symbol] =
          (summary[symbol] || 0) + (Number(amount) + Number(fee));
      }
      return Object.keys(summary).map(k => ({ symbol: k, amount: summary[k] }));
    }
  },
  data: () => ({
    //
  }),
  methods: {
    formatTip(tip) {
      const formatted = Number(tip.amount.toFixed(4)).toString();
      return formatted;
    }
  }
};
</script>
