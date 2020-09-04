<template>
  <PostBrowser ref="browser" :show-reply="true" no-sort :cursor="cursor" />
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
  watch: {
    "$route.query.t": async function () {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      if (this.$refs.browser) this.$refs.browser.reset();

      this.cursor = searchPostsByNotifications(
        this.keys.arbitrary.pub,
        0,
        this.watchedThreads
      );
    },
  },
};
</script>