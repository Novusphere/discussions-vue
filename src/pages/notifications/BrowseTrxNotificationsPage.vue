<template>
  <v-row>
    <v-col :cols="12">
      <TransactionBrowser ref="browser" :cursor="cursor" />
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from "vuex";
import { searchTransactions } from "@/novusphere-js/uid";
import TransactionBrowser from "@/components/TransactionBrowser";

export default {
  name: "BrowseTrxNotificationsPage",
  components: {
    TransactionBrowser,
  },
  props: {},
  computed: {
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    cursor: null,
  }),
  watch: {
    "$route.query.t": async function () {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      if (this.$refs.browser) this.$refs.browser.reset();
      this.cursor = searchTransactions(this.keys.wallet.pub);
    },
  },
};
</script>