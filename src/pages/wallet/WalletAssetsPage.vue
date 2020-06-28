<template>
  <v-row>
    <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 3" v-for="(a, i) in assets" :key="i">
      <v-card>
        <v-list-item three-line>
          <v-list-item-content>
            <v-list-item-title class="headline mb-1">
              <TagLink use-slot :tag="a.symbol">{{ a.symbol }}</TagLink>
            </v-list-item-title>
            <v-list-item-subtitle>{{ a.quantity }}</v-list-item-subtitle>
          </v-list-item-content>

          <TokenIcon :size="80" :symbol="a.symbol" />
        </v-list-item>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import { mapState } from "vuex";
import TagLink from "@/components/TagLink";
import TokenIcon from "@/components/TokenIcon";
import { getSymbols, getAsset } from "@/novusphere-js/uid";

export default {
  name: "WalletAssetsPage",
  components: {
    TagLink,
    TokenIcon
  },
  props: {},
  computed: {
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({
    assets: []
  }),
  async created() {
    const symbols = await getSymbols();
    for (const symbol of symbols) {
      const asset = await getAsset(symbol, this.keys.wallet.pub);
      const [quantity] = asset.split(" ");

      if (Number(quantity) <= 0) continue; // ignore assets with no balance

      this.assets.push({ symbol, quantity });
    }
  }
};
</script>