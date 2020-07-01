<template>
  <div>
    <div v-if="pinned">
      <v-row class="mb-2" v-for="(p, i) in pinned" :key="i">
        <v-col cols="12">
          <PostCard :clickable="true" :display="display" :post="p" />
        </v-col>
      </v-row>
    </div>
    <div>
      <v-row class="mb-2" v-for="(p, i) in posts" :key="i">
        <v-col cols="12">
          <PostCard :clickable="true" :display="display" :post="p" />
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
import PostCard from "@/components/PostCard";

export default {
  name: "PostScroller",
  components: {
    PostCard
  },
  props: {
    pinned: Array,
    posts: Array,
    infinite: Function,
    display: String
  },
  data: () => ({
    //
  }),
  methods: {
    reset() {
      this.$refs.infiniteLoading.stateChanger.reset();
    }
  }
};
</script>
