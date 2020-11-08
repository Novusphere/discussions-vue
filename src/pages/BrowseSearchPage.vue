<template>
  <BrowsePageLayout no-header>
    <template v-slot:content>
      <PostBrowser ref="browser" :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByTextSearch } from "@/novusphere-js/discussions/api";

export default {
  name: "BrowseSearchPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  watch: {
    "$route.query.q": function() {
      this.setQuery();
    }
  },
  data() {
    return {
      cursor: null
    };
  },
  async created() {
    this.setQuery();
  },
  methods: {
    async setQuery() {
      const cursor = searchPostsByTextSearch(this.$route.query.q);
      this.cursor = cursor;
      if (this.$refs.browser) {
        this.$refs.browser.reset(cursor);
      }
    }
  }
};
</script>