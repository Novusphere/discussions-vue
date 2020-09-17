<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <PostBrowser ref="browser" no-sort :cursor="cursor" />
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
  searchPostsByPinned,
  searchPostsBySpam,
  searchPostsByNsfw,
} from "@/novusphere-js/discussions/api";

export default requireLoggedIn({
  name: "BrowseModeratedPostsPage",
  components: {
    BrowsePageLayout,
    PostBrowser,
  },
  props: {},
  data: () => ({
    cursor: null,
  }),
  watch: {
    "$route.params.tag": async function () {
      await this.load();
    },
  },
  computed: {
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      let fn = searchPostsByPinned;
      if (this.$route.params.tag == "spam") fn = searchPostsBySpam;
      else if (this.$route.params.tag == "nsfw") fn = searchPostsByNsfw;

      this.cursor = await fn(
        this.keys.arbitrary.pub,
        [],
        undefined,
        undefined,
        false
      );

      this.$refs.browser.reset(this.cursor);
    },
  },
});
</script>