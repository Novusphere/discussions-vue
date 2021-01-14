<template>
  <div class="d-inline" v-if="link">
    <v-btn text :href="link" target="_blank" v-if="btn">
      <slot></slot>
    </v-btn>
    <a class="text-decoration-none" target="_blank" :href="link" v-else>
      <slot></slot>
    </a>
  </div>
</template>

<script>
import { getTransactionLink } from "@/novusphere-js/uid";

export default {
  name: "PostThreadLink",
  components: {},
  props: {
    btn: Boolean,
    chain: String,
    transaction: String,
  },
  computed: {},
  data: () => ({
    link: "",
  }),
  methods: {
    async setLink() {
      this.link =
        this.chain && this.transaction
          ? await getTransactionLink(this.chain, this.transaction)
          : null;
    },
  },
  watch: {
    async chain() {
      this.setLink();
    },
  },
  async created() {
    await this.setLink();
  },
};
</script>