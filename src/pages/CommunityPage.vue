<template>
  <div>
    <v-row v-for="(comm, i) in communities" :key="i">
      <v-col cols="12">
        <CommunityCard :community="comm" />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import CommunityCard from "@/components/CommunityCard";
import { getCommunities } from "@/novusphere-js/discussions/api";

export default {
  name: "BrowseHotPostsPage",
  components: {
    CommunityCard
  },
  props: {},
  data: () => ({
    communities: []
  }),
  async created() {
    this.communities = (await getCommunities())
      .filter(comm => comm.tag != "test" && comm.desc);
  },
  methods: {}
};
</script>

<style lang="scss">
.community-html {
  img {
    width: 32px;
    height: 32px;
  }
}
</style>