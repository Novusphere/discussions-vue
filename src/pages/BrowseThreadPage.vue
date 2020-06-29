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
  mounted() {
    window.addEventListener("beforeunload", this.leaveGuard);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.leaveGuard);
  },
  beforeRouteLeave(to, from, next) {
    if (this.$refs.browser && this.$refs.browser.hasInput()) {
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
  methods: {
    leaveGuard(e) {
      if (this.$refs.browser && this.$refs.browser.hasInput()) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = "";
      }
    }
  }
};
</script>