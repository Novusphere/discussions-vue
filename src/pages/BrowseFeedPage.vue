<template>
  <BrowsePageLayout>
    <template v-slot:content>
      <PostBrowser :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByFeed } from "@/novusphere-js/discussions/api";

export default {
  name: "BrowseFeedPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  watch: {
    isLoggedIn() {
      if (!this.isLoggedIn) this.$router.push(`/`);
    }
  },
  data: () => ({
    cursor: null
  }),
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      subscribedTags: state => state.subscribedTags,
      followingUsers: state => state.followingUsers
    })
  },
  async created() {
    if (!this.isLoggedIn) this.$router.push(`/`);
    this.cursor = searchPostsByFeed(
      this.subscribedTags,
      this.followingUsers.map(u => u.pub)
    );
  },
  methods: {}
};
</script>