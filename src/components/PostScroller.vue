<template>
  <div>
    <v-row no-gutters>
      <template v-if="pinned && pinned.length > 0">
        <v-col cols="12" style="padding-bottom: 5px;" v-for="(p, i) in pinned" :key="i">
          <PostScrollCard :show-reply="showReply" :display="display" :post="p" />
        </v-col>
      </template>
      <v-col cols="12" style="padding-bottom: 5px;" v-for="(p, i) in posts" :key="i" v-show="!p.isSpam || !hideSpam">
        <PostScrollCard :show-reply="showReply" :display="display" :post="p" />
      </v-col>
      <v-col cols="12">
        <infinite-loading :distance="300" ref="infiniteLoading" @infinite="infinite">
          <div slot="spinner">
            <v-progress-linear class="mt-4" indeterminate></v-progress-linear>
          </div>
          <div slot="no-more">No more posts available</div>
          <div slot="no-results">No posts results were found</div>
        </infinite-loading>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState } from "vuex";
import PostScrollCard from "@/components/PostScrollCard";

export default {
  name: "PostScroller",
  components: {
    PostScrollCard,
    //InfiniteLoading,
  },
  props: {
    pinned: Array,
    posts: Array,
    infinite: Function,
    display: String,
    showReply: Boolean,
  },
  watch: {
    //posts() {
    //  this.show = this.posts.map(() => true);
    //}
  },
  computed: {
    ...mapState({
      hideSpam: (state) => state.hideSpam,
      blurNSFW: (state) => state.blurNSFW,
    }),
  },
  data: () => ({
    //show: []
    islInterval: null,
  }),
  created() {
    // idk why but for some reason this isn't being triggered by their internal system, but by calling it ourselves the bug ius resolved...
    this.islInterval = setInterval(() => {
      if (!this.$refs.infiniteLoading) return;
      this.$refs.infiniteLoading.attemptLoad(false);
    }, 1000);
  },
  beforeDestroy() {
    if (this.islInterval) clearInterval(this.islInterval);
  },
  methods: {
    reset() {
      this.$refs.infiniteLoading.stateChanger.reset();
    },
  },
};
</script>
