<template>
  <div class="d-inline">
    <v-btn text v-if="btn" @click="copy ? copyLink() : goToLink()">
      <slot></slot>
    </v-btn>
    <router-link class="thread-link" :to="link" v-else>
      <slot></slot>
    </router-link>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  name: "PostThreadLink",
  components: {},
  props: {
    btn: Boolean,
    copy: Boolean,
    post: Object
  },
  computed: {
    link() {
      let link = `/tag/${this.post.sub}`;
      if (this.post.op && this.post.transaction != this.post.op.transaction) {
        link += `/${this.post.op.getEncodedId()}/${this.post.op.getSnakeCaseTitle()}/${this.post.getEncodedId()}`;
      } else {
        link += `/${this.post.getEncodedId()}/${this.post.getSnakeCaseTitle()}`;
      }
      return link;
    },
    ...mapState({
      isThreadDialogOpen: state => state.isThreadDialogOpen
    })
  },
  data: () => ({}),
  methods: {
    copyLink() {
      console.log(`copying...`);
      this.$copyText(this.link);
    },
    async goToLink() {
      if (this.isThreadDialogOpen) {
        window.history.pushState({}, null, this.link);
      } else {
        this.$router.push(this.link);
      }
    }
  }
};
</script>

<style>
.thread-link {
  text-decoration: none;
}
</style>