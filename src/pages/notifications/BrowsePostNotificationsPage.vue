<template>
  <PostBrowser no-sort :cursor="cursor" />
</template>

<script>
import { mapState } from "vuex";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByNotifications } from "@/novusphere-js/discussions/api";

export default {
  name: "BrowsePostNotificationsPage",
  components: {
    PostBrowser,
  },
  props: {},
  data: () => ({
    cursor: null,
  }),
  computed: {
    ...mapState({
      keys: (state) => state.keys,
      watchedThreads: (state) => state.watchedThreads,
    }),
  },
  async created() {
    this.cursor = searchPostsByNotifications(
      this.keys.arbitrary.pub,
      0,
      this.watchedThreads
    );
    this.$store.commit("seenNotifications");
  },
  methods: {},
};
</script>