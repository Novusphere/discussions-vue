<template>
  <v-card flat style="height: 100%">
    <v-card-text class="pa-0">
      <AssetCard
        class="mb-2"
        :symbol="community.symbol"
        v-if="community && community.symbol"
      />

      <RecentPostsCard v-if="tags.length > 0" :tags="tags" class="mb-2" />
      <TrendingCard v-else />
    </v-card-text>
  </v-card>
</template>

<script>
import TrendingCard from "@/components/TrendingCard";
//import AboutUsCard from "@/components/AboutUsCard";

import AssetCard from "@/components/AssetCard";
import RecentPostsCard from "@/components/RecentPostsCard";

import { getCommunityByTag } from "@/novusphere-js/discussions/api";

export default {
  name: "AppNavRight",
  mixins: [],
  components: {
    TrendingCard,
    //AboutUsCard,
    AssetCard,
    RecentPostsCard,
  },
  data() {
    return {
      community: null,
      tags: [],
    };
  },
  watch: {
    "$route.params.tags": async function () {
      let tags = this.$route.params.tags;
      console.log(tags);

      if (tags) {
        this.tags = tags.toLowerCase().split(",");
        this.community = await getCommunityByTag(this.tags[0]);
      } else {
        this.community = null;
        this.tags = [];
      }
    },
  },
  computed: {},
  created() {},
  methods: {},
};
</script>