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
import { searchPostsByTransactions } from "@/novusphere-js/discussions/api";

export default {
  name: "TestBrowsePostsPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  data() {
    return {
      cursor: searchPostsByTransactions(this.$route.params.transactionIds.split(','))
    };
  },
  methods: {}
};
</script>