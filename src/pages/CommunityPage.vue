<template>
  <div>      
    <vue-headful :title="pageTitle" />
    <v-row no-gutters v-for="(comm, i) in communities" :key="i" class="mb-2">
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
  computed: {
    pageTitle() {
      return `Discussions - Discover Communities`
    }
  },
  async created() {
    this.communities = (await getCommunities())
      .map(comm => ({ ...comm }))
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