<template>
  <BrowsePageLayout v-if="tags.length > 0">
    <template v-slot:header v-if="community">
      <CommunityCard flat no-view :community="community" v-if="community" />
    </template>
    <template v-slot:content>
      <PostBrowser ref="browser" :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import BrowsePageLayout from "@/components/BrowsePageLayout";
import CommunityCard from "@/components/CommunityCard";
import PostBrowser from "@/components/PostBrowser";
import {
  searchPostsByTags,
  getCommunities
} from "@/novusphere-js/discussions/api";

export default {
  name: "BrowseHotPostsPage",
  components: {
    BrowsePageLayout,
    PostBrowser,
    CommunityCard
  },
  props: {},
  watch: {
    "$route.params.tags": function() {
      this.setTags();
      this.$forceUpdate();
    }
  },
  data: () => ({
    tags: [],
    cursor: null,
    community: null
  }),
  async created() {
    await this.setTags();
  },
  methods: {
    async setTags() {
      const tags = this.$route.params.tags.split(",");
      const cursor = searchPostsByTags(tags);

      this.tags = tags;
      this.cursor = cursor;

      if (this.$refs.browser) {
        this.$refs.browser.reset(cursor);
      }

      if (this.tags.length != 1) {
        this.community = null;
        return;
      }

      const community = (await getCommunities()).find(
        t => t.tag == this.tags[0]
      );

      this.community = community ? community : null;
    }
  }
};
</script>