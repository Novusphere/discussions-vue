<template>
  <BrowsePageLayout>
    <template v-slot:content>
      <PostBrowser v-if="cursor" :show-reply="true" :cursor="cursor" />
      <div v-else class="text-center">
        <span>It looks like you're not subscribed to any tags, or following any users! Click the button below to discover some reccomended communities and users.</span>
        <v-spacer />
        <v-btn color="primary" class="mt-2" :to="`/discover`">Discover</v-btn>
      </div>
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
    PostBrowser,
  },
  props: {},
  data: () => ({
    cursor: null,
  }),
  computed: {
    ...mapState({
      subscribedTags: (state) => state.subscribedTags,
      followingUsers: (state) => state.followingUsers,
    }),
  },
  async created() {
    if (this.subscribedTags.length > 0 || this.followingUsers.length > 0) {
      this.cursor = searchPostsByFeed(
        this.subscribedTags,
        this.followingUsers.map((u) => u.pub)
      );
    } else {
      this.cursor = null;
    }
  },
  methods: {},
});
</script>