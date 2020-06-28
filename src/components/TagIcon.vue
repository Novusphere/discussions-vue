<template>
  <v-avatar :size="size ? size : 32" v-if="icon">
    <img :src="icon" />
  </v-avatar>
</template>

<script>
import { getCommunities } from "@/novusphere-js/discussions/api";

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
      const communities = await getCommunities();
      let community =
        communities.find(comm => comm.tag == this.tag) ||
        communities.find(comm => comm.tag == "atmos");
      if (community) {
        this.icon = community.icon;
      }
    }
  }
};
</script>
