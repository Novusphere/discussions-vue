<template>
  <v-row>
    <v-col
      v-for="(s, i) in symbols"
      :key="i"
      :cols="$vuetify.breakpoint.mobile ? 12 : 3"
      v-show="show[i]"
    >
      <AssetCard ref="assets" hide-zero :symbol="s" @data="({zero}) => updateShow(i, !zero)" />
    </v-col>
    <v-col :cols="12">
      <TransactionBrowser
        ref="browser"
        :filter="trxFilter"
        :cursor="cursor"
        @change-filter="changeFilter"
      />
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from "vuex";
import { getSymbols, searchTransactions } from "@/novusphere-js/uid";
import AssetCard from "@/components/AssetCard";
import TransactionBrowser from "@/components/TransactionBrowser";

export default {
  name: "WalletAssetsPage",
  components: {
    TransactionBrowser,
    AssetCard,
  },
  props: {},
  computed: {
    ...mapState({
      keys: (state) => state.keys,
    }),
    showSymbols() {
      return this.symbols.filter((s, i) => this.show[i]);
    },
  },
  data: () => ({
    symbols: [],
    show: [],
    cursor: null,
    trxFilter: "all",
  }),
  async created() {
    this.symbols = await getSymbols();
    this.show = this.symbols.map(() => false);
    this.cursor = searchTransactions(this.keys.wallet.pub);
  },
  methods: {
    updateShow(i, value) {
      this.show[i] = value;
      this.$forceUpdate();
    },
    changeFilter(v) {
      this.trxFilter = v;
      this.cursor = searchTransactions(this.keys.wallet.pub, v);
      this.$refs.browser.reset();
    },
  },
};
</script>