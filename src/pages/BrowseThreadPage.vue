<template>
  <ThreadBrowser ref="browser" :referenceId="$route.params.referenceId" />
</template>

<script>
import ThreadBrowser from "@/components/ThreadBrowser";

export default {
  name: "BrowseThreadPage",
  components: {
    ThreadBrowser
  },
  props: {},
  data: () => ({}),
  beforeRouteLeave(to, from, next) {
    if (this.$refs.browser.hasInput()) {
      const answer = window.confirm(
        "Do you really want to leave? you have unsaved changes!"
      );
      if (answer) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },
  methods: {}
};
</script>