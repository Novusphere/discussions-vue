<template>
  <v-avatar :size="size ? size : 32">
    <img :src="link" />
  </v-avatar>
</template>

<script>
import { API_URL } from "@/novusphere-js/discussions/api";

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
          pub: "EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe", // xia256
          link:
            "https://atmosdb.novusphere.io/discussions/upload/image/1594320203561.png"
        },
        {
          pub: "EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH", // jack
          link:
            "https://atmosdb.novusphere.io/discussions/upload/image/1594331019213.png"
        },
        {
          pub: "EOS6sYMyMHzHhGtfwjCcZkRaw3YK5ws8xoD6ke2DNUmnHT3j1cpjV", // brain
          link:
            "https://atmosdb.novusphere.io/discussions/upload/image/1594331754924.png"
        },
        {
          pub: "paul", // paul
          link: ""
        }
      ].find(sp => sp.pub == this.publicKey);

      if (special) this.link = special.link;
      else
        this.link = `${API_URL}/v1/api/data/keyicon/${
          this.publicKey
        }.svg?dark=${this.$vuetify.theme.dark ? "true" : ""}`;
    }
  }
};
</script>
