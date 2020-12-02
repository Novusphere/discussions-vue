<template>
  <v-select
    v-model="valueProxy"
    :items="assets"
    :rules="rules"
    :item-text="itemText"
    item-value="symbol"
    :label="label"
    :required="required"
    :disabled="disabled"
  >
    <template v-slot:prepend>
      <TokenIcon v-if="valueProxy" :symbol="valueProxy" />
    </template>
    <template v-slot:item="{ item }">
      <TokenIcon :symbol="item.symbol" />
      {{ !noAmount ? item.asset : item.asset.split(" ")[1] }}
    </template>
  </v-select>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { getSymbols, getAsset } from "@/novusphere-js/uid";

import TokenIcon from "@/components/TokenIcon";

export default {
  name: "UserAssetSelect",
  components: {
    TokenIcon,
  },
  props: {
    label: { type: String, default: "Asset" },
    disabled: Boolean,
    exclude: Array,
    include: Array,
    value: String,
    required: Boolean,
    allowZero: Boolean,
    noAmount: Boolean,
    itemText: { type: String, default: "asset" },
  },
  computed: {
    rules() {
      let rules = [];
      if (this.required) {
        if (!this.valueProxy) rules.push(`Item is required`);
      }
      return rules;
    },
    valueProxy: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("input", value);
      },
    },
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    assets: [],
  }),
  async created() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      this.assets = [];

      if (!this.isLoggedIn) return;

      let symbols = await getSymbols();

      if (this.exclude) {
        symbols = symbols.filter((s) => !this.exclude.some((s2) => s2 == s));
      }

      if (this.include) {
        symbols = symbols.filter((s) => this.include.some((s2) => s2 == s));
      }

      const assets = await Promise.all(
        symbols.map((s) => getAsset(s, this.keys.wallet.pub))
      );

      for (const asset of assets) {
        const [quantity, symbol] = asset.split(" ");
        if (!this.allowZero && Number(quantity) <= 0) continue; // ignore assets with no balance
        this.assets.push({ symbol, quantity, asset });
      }
    },
  },
};
</script>