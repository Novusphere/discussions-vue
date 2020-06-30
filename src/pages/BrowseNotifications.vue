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
  watch: {
    isLoggedIn() {
      if (!this.isLoggedIn) this.$router.push(`/`);
    }
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: state => state.keys,
      watchedThreads: state => state.watchedThreads
    })
  },
  async created() {
    if (!this.isLoggedIn) this.$router.push(`/`);
    this.cursor = searchPostsByNotifications(this.keys.arbitrary.pub, 0, this.watchedThreads);
    this.$store.commit("seenNotifications");
  },
  methods: {}
};
</script>