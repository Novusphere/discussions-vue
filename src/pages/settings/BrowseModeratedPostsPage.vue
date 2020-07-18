<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <PostBrowser no-sort no-cursor :pinned="pinned" />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { requireLoggedIn } from "@/utility";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import {
  getPinnedPosts,
  getSpamPosts,
  getNsfwPosts
} from "@/novusphere-js/discussions/api";

export default requireLoggedIn({
  name: "BrowseModeratedPostsPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  data: () => ({
    pinned: []
  }),
  watch: {
    "$route.params.tag": async function() {
      await this.load();
    }
  },
  computed: {
    ...mapState({
      keys: state => state.keys
    })
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      let fn = getPinnedPosts;
      if (this.$route.params.tag == "spam") fn = getSpamPosts;
      else if (this.$route.params.tag == "nsfw") fn = getNsfwPosts;

      this.pinned = await fn(
        this.keys.arbitrary.pub,
        [],
        undefined,
        undefined,
        false
      );
    }
  }
});
</script>