<template>
  <BrowsePageLayout>
    <template v-slot:content>
      <PostBrowser :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
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
    cursor: searchPostsByAll()
  }),
  async created() {
  },
  methods: {}
};
</script>