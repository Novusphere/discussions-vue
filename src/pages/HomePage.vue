<template>
  <div></div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  name: "HomePage",
  components: {},
  props: {},
  data: () => ({}),
  computed: {
    ...mapGetters(["isLoggedIn"]),
  },
  created() {
    //if (this.isLoggedIn) {
    //  this.$router.push(`/feed`);
    //} else {
    this.$router.push(`/tag/all`);
    //}
  },
};
</script>