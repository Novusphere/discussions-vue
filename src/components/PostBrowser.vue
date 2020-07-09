<template>
  <div>
    <v-progress-linear v-if="!cursor" indeterminate></v-progress-linear>
    <div v-else>
      <v-row align="start" justify="end">
        <PostSortSelect v-if="!noSort" v-model="sort" />
        <PostDisplaySelect v-model="display" />
      </v-row>
      <PostScroller
        ref="scroller"
        :pinned="pinned"
        :posts="posts"
        :display="display"
        :infinite="infinite"
      />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import PostScroller from "@/components/PostScroller";
import PostSortSelect from "@/components/PostSortSelect";
import PostDisplaySelect from "@/components/PostDisplaySelect";

export default {
  name: "PostBrowser",
  components: {
    PostSortSelect,
    PostDisplaySelect,
    PostScroller
  },
  props: {
    noSort: Boolean,
    cursor: Object,
    pinned: Array
  },
  data: () => ({
    posts: [],
    display: "",
    sort: ""
  }),
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: state => state.keys
    })
  },
  watch: {
    async isLoggedIn() {
      await this.reset();
    },
    async sort() {
      this.cursor.sort = this.sort;
      this.reset();
    }
  },
  async created() {
    if (this.noSort && this.cursor) {
      // sort should already be set in the cursor if no-sort is being specified
      this.sort = this.cursor.sort;
    }
    if (this.cursor) {
      this.cursor.votePublicKey = this.isLoggedIn
        ? this.keys.arbitrary.pub
        : undefined;
      this.cursor.sort = this.sort;
    }
  },
  methods: {
    reset(cursor) {
      cursor = cursor || this.cursor;
      cursor.votePublicKey = this.isLoggedIn
        ? this.keys.arbitrary.pub
        : undefined;
      cursor.sort = this.sort;
      cursor.reset();

      this.posts = [];

      if (this.$refs.scroller) {
        this.$refs.scroller.reset();
      }
    },
    async infinite($state) {
      console.proxyLog(`PostBrowser infinite scroller called`);
      let posts = undefined;
      try {
        posts = await this.cursor.next();
      } catch (ex) {
        // error stop loading...
        console.proxyLog(ex);
        $state.complete();
        return;
      }

      if (posts.length > 0) {
        if (this.pinned) {
          // prevent duplicates
          posts = posts.filter(
            p => !this.pinned.some(p2 => p.transaction == p2.transaction)
          );
        }
        this.posts.push(...posts);
        $state.loaded();
      } else {
        $state.complete();
      }
    }
  }
};
</script>