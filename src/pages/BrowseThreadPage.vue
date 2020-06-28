<template>
  <ThreadBrowser :referenceId="$route.params.referenceId" />
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
  methods: {}
};
</script>