<template>
  <v-card>
    <v-card-title>Insert Link</v-card-title>
    <v-card-text>
      <v-text-field v-model="link" label="Link"></v-text-field>
      <v-btn color="primary" @click="insertLink">Insert</v-btn>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
//import { sleep } from "@/novusphere-js/utility";

export default {
  name: "InsertLinkCard",
  components: {},
  props: {},
  data: () => ({
    link: ""
  }),
  computed: {
    ...mapState({
      onInsertLink: state => state.onInsertLink,
      initialInsertedLink: state => state.initialInsertedLink
    })
  },
  watch: {
    initialInsertedLink() {
      if (this.initialInsertedLink) {
        this.link = this.initialInsertedLink;
      }
    }
  },
  methods: {
    async insertLink() {
      const link = this.link.trim();
      this.link = "";

      if (this.onInsertLink) {
        this.onInsertLink(link);
      }
    }
  }
};
</script>