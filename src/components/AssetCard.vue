<template>
  <v-card v-if="!zero || !hideZero">
    <v-list-item three-line>
      <v-list-item-content>
        <v-list-item-title class="headline mb-1">
          <TagLink use-slot :tag="symbol">{{ symbol }}</TagLink>
        </v-list-item-title>
        <v-list-item-subtitle>{{ quantity }}</v-list-item-subtitle>
        <v-list-item-subtitle v-if="price" style="font-size: 10px;">{{ price }}/{{ symbol }}</v-list-item-subtitle>
      </v-list-item-content>
      <div>
        <TokenIcon :size="80" :symbol="symbol" />
      </div>
    </v-list-item>
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { createAsset, getAsset, getMarketCaps } from "@/novusphere-js/uid";
import TagLink from "@/components/TagLink";
import TokenIcon from "@/components/TokenIcon";

export default {
  name: "AssetCard",
  components: {
    TagLink,
    TokenIcon,
  },
  props: {
    symbol: String,
    hideZero: Boolean,
    cols: Number,
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    quantity: "",
    zero: true,
    price: "",
    change24: "",
  }),
  watch: {
    async symbol() {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      if (this.isLoggedIn) {
        const asset = await getAsset(this.symbol, this.keys.wallet.pub);
        const [quantity] = asset.split(" ");

        this.quantity = quantity;
        this.zero = Number(quantity) <= 0;

        if (!this.zero) {
          const mcaps = await getMarketCaps();

          const eosCap = mcaps["EOS"];
          const thisCap = mcaps[this.symbol];
          if (eosCap && thisCap) {
            if (this.symbol != "EOS") {
              this.price = `${(thisCap.price / eosCap.price).toFixed(6)} EOS`;
              this.change24 = thisCap.percentChange24h;
            }
          }
        }

        this.$emit("data", { quantity, symbol: this.symbol, zero: this.zero });
      } else {
        this.quantity = await createAsset(0, this.symbol);
      }
    },
  },
};
</script>