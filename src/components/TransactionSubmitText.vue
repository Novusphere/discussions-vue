<template>
  <div class="text-center" v-show="link || error">
    <div class="success--text" v-show="link">
      <slot></slot>
      <a :href="link" target="_blank">View Transaction</a>
    </div>
    <div class="error--text" v-show="error">{{ error }}</div>
  </div>
</template>

<script>
export default {
  name: "TransactionSubmitText",
  components: {},
  props: {
      link: String,
      error: String
  },
  data: () => ({})
};
</script>