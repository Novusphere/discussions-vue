<template>
  <BrowsePageLayout v-if="tags.length > 0">
    <template v-slot:header v-if="community">
      <CommunityCard flat no-view :community="community" v-if="community" />
    </template>
    <template v-slot:content>
      <PostBrowser :pinned="pinned" ref="browser" :cursor="cursor" />
    </template>
    <template v-slot:right>
      <AssetCard class="mb-2" :symbol="community.symbol" v-if="community && community.symbol"  />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import CommunityCard from "@/components/CommunityCard";
import AssetCard from "@/components/AssetCard";
import PostBrowser from "@/components/PostBrowser";
import {
  getPinnedPosts,
  searchPostsByTags,
  getCommunityByTag
} from "@/novusphere-js/discussions/api";

export default {
  name: "BrowseHotPostsPage",
  components: {
    BrowsePageLayout,
    PostBrowser,
    CommunityCard,
    AssetCard
  },
  props: {},
  computed: {
    ...mapGetters(["isLoggedIn", "getModeratorKeys"]),
    ...mapState({
      keys: state => state.keys
    })
  },
  watch: {
    "$route.params.tags": function() {
      this.load();
    },
    isLoggedIn() {
      if (this.isLoggedIn) this.load();
    }
  },
  data: () => ({
    tags: [],
    pinned: [],
    cursor: null,
    community: null
  }),
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      this.cursor = null;
      this.pinned = [];

      const tags = this.$route.params.tags.split(",");
      const mods = this.getModeratorKeys(tags);
      const cursor = searchPostsByTags(tags);
      cursor.moderatorKeys = mods;

      let pinned = [];

      if (mods.length > 0) {
        pinned = await getPinnedPosts(
          this.isLoggedIn ? this.keys.arbitrary.pub : undefined,
          mods,
          tags
        );
      }

      this.tags = tags;
      this.cursor = cursor;
      this.pinned = pinned;

      if (this.$refs.browser) {
        this.$refs.browser.reset(cursor);
      }

      if (this.tags.length != 1) {
        this.community = null;
        return;
      }

      const community = await getCommunityByTag(this.tags[0]);
      this.community = community ? community : null;
    }
  }
};
</script>