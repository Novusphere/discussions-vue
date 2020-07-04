<template>
  <v-card v-if="!zero || !hideZero">
    <v-list-item three-line>
      <v-list-item-content>
        <v-list-item-title class="headline mb-1">
          <TagLink use-slot :tag="symbol">{{ symbol }}</TagLink>
        </v-list-item-title>
        <v-list-item-subtitle>{{ quantity }}</v-list-item-subtitle>
      </v-list-item-content>

      <TokenIcon :size="80" :symbol="symbol" />
    </v-list-item>
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { getAsset } from "@/novusphere-js/uid";
import TagLink from "@/components/TagLink";
import TokenIcon from "@/components/TokenIcon";

export default {
  name: "AssetCard",
  components: {
    TagLink,
    TokenIcon
  },
  props: {
    symbol: String,
    hideZero: Boolean,
    cols: Number
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({
    quantity: "",
    zero: true
  }),
  async created() {
    if (this.isLoggedIn) {
      const asset = await getAsset(this.symbol, this.keys.wallet.pub);
      const [quantity] = asset.split(" ");

      this.quantity = quantity;
      this.zero = Number(quantity) <= 0;

      this.$emit("data", { quantity, symbol: this.symbol, zero: this.zero });
    }
  }
};
</script>