<template>
  <v-avatar :size="size ? size : 24" v-if="icon">
    <img :src="icon" />
  </v-avatar>
</template>

<script>
import { getTokens } from "@/novusphere-js/discussions/api";

export default {
  name: "TokenIcon",
  components: {},
  props: {
    symbol: String,
    size: Number
  },
  data: () => ({
    icon: ""
  }),
  watch: {
    async symbol() {
      await this.load();
    }
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      const symbol = this.symbol.toUpperCase();
      const tokens = await getTokens();
      const token =
        tokens.find(t => t.symbol == symbol) ||
        tokens.find(t => t.symbol == "ATMOS");
      if (token) {
        this.icon = token.logo;
      }
    }
  }
};
</script>
