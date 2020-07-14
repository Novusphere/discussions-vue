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
    <template v-slot:item="{ item }">
      <TokenIcon :symbol="item.symbol" />
      {{ !noAmount ? item.asset : (item.asset.split(' ')[1]) }}
    </template>
  </v-select>
</template>

<script>
import { mapState } from "vuex";
import { getSymbols, getAsset } from "@/novusphere-js/uid";
import { sleep } from "@/novusphere-js/utility";

import TokenIcon from "@/components/TokenIcon";

export default {
  name: "UserAssetSelect",
  components: {
    TokenIcon
  },
  props: {
    label: { type: String, default: "Asset" },
    disabled: Boolean,
    value: String,
    required: Boolean,
    allowZero: Boolean,
    noAmount: Boolean,
    itemText: { type: String, default: "asset" }
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
      }
    },
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({
    assets: []
  }),
  async created() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      this.assets = [];
      const symbols = await getSymbols();
      for (const symbol of symbols) {
        try {
          const asset = await getAsset(symbol, this.keys.wallet.pub);
          const [quantity] = asset.split(" ");

          if (!this.allowZero && Number(quantity) <= 0) continue; // ignore assets with no balance

          this.assets.push({ symbol, quantity, asset });
        } catch (ex) {
          console.log(`Could not load user asset ${symbol}`);
          console.error(ex);
        }

        await sleep(100);
      }
    }
  }
};
</script>