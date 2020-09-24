<template>
  <div>
    <v-row no-gutters>
      <div v-if="pinned">
        <v-col cols="12" v-for="(p, i) in pinned" :key="i">
          <PostScrollCard :show-reply="showReply" :display="display" :post="p" />
        </v-col>
      </div>
      <div>
        <v-col cols="12" v-for="(p, i) in posts" :key="i" v-show="!p.isSpam || !hideSpam">
          <PostScrollCard :show-reply="showReply" :display="display" :post="p" />
        </v-col>
      </div>
    </v-row>
    <v-row>
      <v-col cols="12">
        <infinite-loading ref="infiniteLoading" @infinite="infinite">
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
  }),
  created() {},
  methods: {
    reset() {
      this.$refs.infiniteLoading.stateChanger.reset();
    },
  },
};
</script>
