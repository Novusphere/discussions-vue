<template>
  <v-avatar :size="size ? size : 24">
    <img v-if="link" :src="link" />
  </v-avatar>
</template>

<script>
import * as axios from "axios";
import { getAPIHost } from "@/novusphere-js/discussions/api";
import { getFromCache } from "@/novusphere-js/utility";

let cache = {};

export default {
  name: "PublicKeyIcon",
  components: {},
  props: {
    publicKey: String,
    size: Number
  },
  data: () => ({
    link: ''
  }),
  watch: {
    async publicKey() {
      await this.setLink();
    }
  },
  async created() {
    await this.setLink();
  },
  methods: {
    async setLink() {
      // just for fun
      const specialIcons = await getFromCache(
        cache,
        "publicKeyIcons",
        async () => {
          try {
            const { data } = await axios.get(
              `https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/publickeyicons.json`
            );
            return data;
          } catch (ex) {
            return [];
          }
        }
      );

      const special = specialIcons.find(sp => sp.pub == this.publicKey);

      if (special) this.link = special.link;
      else this.link = `${await getAPIHost()}/v1/api/data/keyicon/${this.publicKey}.svg`;
    }
  }
};
</script>
