<template>
  <div>
    <v-progress-linear v-if="!cursor" indeterminate></v-progress-linear>
    <div v-else>
      <slot name="body"></slot>
      <TransactionScroller ref="scroller" :trxs="trxs" :infinite="infinite" />
    </div>
  </div>
</template>

<script>
import TransactionScroller from "@/components/TransactionScroller";

export default {
  name: "TransactionBrowser",
  components: {
    TransactionScroller,
  },
  props: {
    cursor: Object,
  },
  data: () => ({
    trxs: [],
  }),
  computed: {},
  watch: {},
  async created() {},
  methods: {
    async infinite($state) {
      console.proxyLog(`TransactionBrowser infinite scroller called`);

      let trxs = undefined;
      try {
        trxs = await this.cursor.next();
      } catch (ex) {
        // error stop loading...
        console.proxyLog(ex);
        $state.complete();
        return;
      }

      if (trxs.length > 0) {
        this.trxs.push(...trxs);
        $state.loaded();
        if (!this.cursor.hasMore()) {
          $state.complete();
        }
      } else {
        $state.complete();
      }
    },
  },
};
</script>