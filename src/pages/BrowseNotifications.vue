<template>
  <BrowsePageLayout>
    <template v-slot:content>
      <PostBrowser no-sort :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByNotifications } from "@/novusphere-js/discussions/api";

export default {
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
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: state => state.keys,
      watchedPosts: state => [] || state // TO-DO
    })
  },
  async created() {
    if (!this.isLoggedIn) this.$router.push(`/`);
    this.cursor = searchPostsByNotifications(this.keys.arbitrary.pub, 0);
  },
  methods: {}
};
</script>