<template>
  <v-row>
    <v-col
      :cols="$vuetify.breakpoint.mobile ? 12 : 3"
      v-for="(s, i) in symbols"
      :key="i"
      v-show="show[i]"
    >
      <AssetCard ref="assets" hide-zero :symbol="s" @data="({zero}) => show[i] = zero" />
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from "vuex";
import { getSymbols } from "@/novusphere-js/uid";
import AssetCard from "@/components/AssetCard";

export default {
  name: "WalletAssetsPage",
  components: {
    AssetCard
  },
  props: {},
  computed: {
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({
    symbols: [],
    show: []
  }),
  async created() {
    this.symbols = await getSymbols();
    this.show = this.symbols.map(() => true);
    this.show[2] = false;
  }
};
</script>