<template>
  <div>
  </div>
</template>

<script>
export default {
  name: "ClosePage",
  components: {},
  props: {},
  data: () => ({}),
  created() {
    if (window.opener && window.opener.closePageCallback) {
      window.opener.closePageCallback(this.$route.query);
    }
    window.close();
  },
};
</script>