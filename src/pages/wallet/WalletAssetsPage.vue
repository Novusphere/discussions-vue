<template>
  <v-row>
    <v-col
      :cols="$vuetify.breakpoint.mobile ? 12 : 3"
      v-for="(s, i) in symbols"
      :key="i"
      v-show="show[i]"
    >
      <AssetCard ref="assets" hide-zero :symbol="s" @data="({zero}) => show[i] = !zero" />
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
  },
  data: () => ({
    symbols: [],
    show: [],
    cursor: null,
    trxFilter: "all",
  }),
  async created() {
    console.log(`created`);
    this.symbols = await getSymbols();
    this.show = this.symbols.map(() => true);
    this.cursor = searchTransactions(this.keys.wallet.pub);
  },
  methods: {
    changeFilter(v) {
      this.trxFilter = v;
      this.cursor = searchTransactions(this.keys.wallet.pub, v);
      this.$refs.browser.reset();
    },
  },
};
</script>