<template>
  <v-avatar :size="size ? size : 32">
    <img :src="link" />
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
    link: String
  }),
  watch: {
    publicKey() {
      this.setLink();
    }
  },
  created() {
    this.setLink();
  },
  methods: {
    setLink() {
      // just for fun
      const special = [
        {
          pub: "EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe",
          link:
            "https://atmosdb.novusphere.io/discussions/upload/image/1594319191670.png"
        }
      ].find(sp => sp.pub == this.publicKey);

      if (special) this.link = special.link;
      else
        this.link =
          "https://atmosdb.novusphere.io/discussions/keyicon/" + this.publicKey;
    }
  }
};
</script>
