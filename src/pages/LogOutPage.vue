<template>
  <div>
  </div>
</template>

<script>
export default {
  name: "LogOutPage",
  components: {},
  props: {},
  data: () => ({}),
  async created() {
      this.$store.commit('logout');
      this.$router.push(`/`);
  }
};
</script>