<template>
  <div class="d-inline">
    <v-btn text v-if="btn" :to="link">
      <slot></slot>
    </v-btn>
    <router-link class="thread-link" :to="link" v-else>
      <slot></slot>
    </router-link>
  </div>
</template>

<script>
export default {
  name: "PostThreadLink",
  components: {},
  props: {
    btn: Boolean,
    post: Object
  },
  computed: {
    link() {
      let link = `/tag/${this.post.sub}`;
      if (this.post.op && this.post.transaction != this.post.op.transaction) {
        link += `/${this.post.op.getEncodedId()}`;
      }
      link += `/${this.post.getEncodedId()}`;
      return link;
    }
  },
  data: () => ({}),
  methods: {}
};
</script>

<style>
.thread-link {
  text-decoration: none;
}
</style>