<template>
  <v-avatar :size="size ? size : 32">
    <img :src="'https://atmosdb.novusphere.io/discussions/keyicon/' + publicKey">
  </v-avatar>
</template>

<script>
export default {
  name: "PublicKeyIcon",
  components: {},
  props: {
    publicKey: String,
    size: Number
  },
  data: () => ({
    //
  })
};
</script>
