<template>
  <BrowsePageLayout no-header>
    <template v-slot:content>
      <PostBrowser ref="browser" :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapGetters } from "vuex";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByAll } from "@/novusphere-js/discussions/api";
//import { searchPostsByTags } from "@/novusphere-js/discussions/api";

export default {
  name: "BrowseTrendingPostsPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  data: () => ({
    cursor: null
  }),
  computed: {
    ...mapGetters(["isLoggedIn"]),
  },
  async created() {
  },
  async mounted() {
    const ignoreTags = ['test'];
    if (!this.isLoggedIn) {
      ignoreTags.push('nsfw');
    }
    this.cursor = searchPostsByAll(ignoreTags);
    this.$refs.browser.reset(this.cursor);
  },
  methods: {}
};
</script>