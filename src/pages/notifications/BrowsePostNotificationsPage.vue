<template>
  <PostBrowser ref="browser" :show-reply="true" no-sort :cursor="cursor" />
</template>

<script>
import PostBrowser from "@/components/PostBrowser";
import { userActionsMixin } from "@/mixins/userActions";

export default {
  name: "BrowsePostNotificationsPage",
  mixins: [userActionsMixin],
  components: {
    PostBrowser,
  },
  props: {},
  data: () => ({
    cursor: null,
  }),
  computed: {},
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
      this.cursor = this.searchPostsByNotifications(0);
    },
  },
};
</script>