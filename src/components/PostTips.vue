<template>
  <div>
    <div v-for="(tip, i) in tips" :key="i" class="d-inline-block" :class="{ 'pl-1': (i > 0) }">
      <TokenIcon :size="16" :symbol="tip.symbol" />
      <span>x{{ formatTip(tip) }}</span>
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
      //let summary = { 'a': 1.234, 'b': 2.234, 'c': 3.111, 'd': 4.222, 'e': 555, 'f': 123.456 };
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
