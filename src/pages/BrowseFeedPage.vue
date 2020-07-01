<template>
  <BrowsePageLayout>
    <template v-slot:content>
      <PostBrowser :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState } from "vuex";
import { requireLoggedIn } from "@/utility";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByFeed } from "@/novusphere-js/discussions/api";

export default requireLoggedIn({
  name: "BrowseFeedPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  data: () => ({
    cursor: null
  }),
  computed: {
    ...mapState({
      subscribedTags: state => state.subscribedTags,
      followingUsers: state => state.followingUsers
    })
  },
  async created() {
    this.cursor = searchPostsByFeed(
      this.subscribedTags,
      this.followingUsers.map(u => u.pub)
    );
  },
  methods: {}
});
</script>