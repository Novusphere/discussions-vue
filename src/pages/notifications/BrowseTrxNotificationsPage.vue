<template>
  <v-row>
    <v-col :cols="12">
      <TransactionBrowser :cursor="cursor" />
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
    TransactionBrowser
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
  async created() {
    this.cursor = searchTransactions(this.keys.wallet.pub);
  },
};
</script>