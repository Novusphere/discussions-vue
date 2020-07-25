<template>
  <div>
    <v-row class="mb-2" v-for="(trx, i) in trxs" :key="i.id">
      <v-col cols="12">
        <TransactionCard :trx="trx" />
      </v-col>
    </v-row>
    <infinite-loading ref="infiniteLoading" @infinite="infinite">
      <div slot="spinner">
        <v-progress-linear class="mt-4" indeterminate></v-progress-linear>
      </div>
      <div slot="no-more">No more transactions available</div>
      <div slot="no-results">No transaction results were found</div>
    </infinite-loading>
  </div>
</template>

<script>
import TransactionCard from "@/components/TransactionCard";

export default {
  name: "TransactionScroller",
  components: {
    TransactionCard,
  },
  props: {
    trxs: Array,
    infinite: Function,
  },
  watch: {},
  computed: {},
  data: () => ({}),
  created() {},
  methods: {
    reset() {
      this.$refs.infiniteLoading.stateChanger.reset();
    },
  },
};
</script>
