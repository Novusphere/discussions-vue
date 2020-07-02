<template>
  <v-avatar :size="size ? size : 32" v-if="icon">
    <img :src="icon" />
  </v-avatar>
</template>

<script>
import { getCommunityByTag } from "@/novusphere-js/discussions/api";

export default {
  name: "TagIcon",
  components: {},
  props: {
    tag: String,
    size: Number
  },
  data: () => ({
    icon: ""
  }),
  watch: {
    async tag() {
      await this.setIcon();
    }
  },
  async created() {
    await this.setIcon();
  },
  methods: {
    async setIcon() {
      let community = await getCommunityByTag(this.tag);
      if (community) {
        this.icon = community.icon;
      }
    }
  }
};
</script>
