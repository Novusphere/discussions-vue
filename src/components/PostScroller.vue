<template>
  <div>
    <div v-if="pinned">
      <v-row class="mb-2" v-for="(p, i) in pinned" :key="i">
        <v-col cols="12">
          <PostScrollCard :display="display" :post="p" />
        </v-col>
      </v-row>
    </div>
    <div>
      <v-row class="mb-2" v-for="(p, i) in posts" :key="i" v-show="!p.isSpam || !hideSpam">
        <v-col cols="12">
          <PostScrollCard :display="display" :post="p" />
        </v-col>
      </v-row>
      <infinite-loading ref="infiniteLoading" @infinite="infinite">
        <div slot="spinner">
          <v-progress-linear class="mt-4" indeterminate></v-progress-linear>
        </div>
        <div slot="no-more">No more posts available</div>
        <div slot="no-results">No posts results were found</div>
      </infinite-loading>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import PostScrollCard from "@/components/PostScrollCard";

export default {
  name: "PostScroller",
  components: {
    PostScrollCard
  },
  props: {
    pinned: Array,
    posts: Array,
    infinite: Function,
    display: String
  },
  watch: {
    //posts() {
    //  this.show = this.posts.map(() => true);
    //}
  },
  computed: {
    ...mapState({
      hideSpam: state => state.hideSpam,
      blurNSFW: state => state.blurNSFW
    })
  },
  data: () => ({
    //show: []
  }),
  created() {},
  methods: {
    reset() {
      this.$refs.infiniteLoading.stateChanger.reset();
    }
  }
};
</script>
