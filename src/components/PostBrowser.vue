<template>
  <div>
    <v-progress-linear v-if="!cursor && !noCursor" indeterminate></v-progress-linear>
    <div v-else>
      <v-row align="start" justify="end">
        <PostSortSelect v-if="!noSort" v-model="sort" />
        <PostDisplaySelect v-model="display" />
      </v-row>
      <slot name="body"></slot>
      <PostScroller
        ref="scroller"
        :show-reply="showReply"
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
    PostScroller,
  },
  props: {
    noSort: Boolean,
    noCursor: Boolean,
    cursor: Object,
    pinned: Object, // cursor
    showReply: Boolean,
  },
  data: () => ({
    posts: [],
    display: "",
    sort: "",
  }),
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
      delegatedMods: (state) => state.delegatedMods,
      postSort: (state) => state.postSort,
    }),
  },
  watch: {
    async isLoggedIn() {
      await this.reset();
    },
    async sort() {
      if (this.cursor) {
        this.cursor.sort = this.sort;
      }
      this.reset();
    },
  },
  async created() {
    this.sort = this.postSort || "";

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
      if (cursor) {
        cursor.moderatorKeys =
          this.delegatedMods.length > 0
            ? this.delegatedMods.map((dm) => dm.pub)
            : undefined;

        cursor.votePublicKey = this.isLoggedIn
          ? this.keys.arbitrary.pub
          : undefined;

        if (!this.noSort) cursor.sort = this.sort;

        cursor.reset();
      }

      this.posts = [];

      if (this.$refs.scroller) {
        this.$refs.scroller.reset();
      }
    },
    async infinite($state) {
      console.log(`PostBrowser infinite scroller called`);

      if (this.noCursor) {
        $state.loaded();
        $state.complete();
        console.log(`Infinite Scroll no cursor`);
      }

      if (this.posts.length == 0) {
        if (this.pinned) {
          const pinned = await this.pinned.next();
          this.posts.push(...pinned);
        }
      }

      let posts = undefined;
      try {
        posts = await this.cursor.next();
      } catch (ex) {
        // error stop loading...
        console.log(ex);
        $state.complete();
        return;
      }

      if (posts.length > 0) {
        // prevent potential duplicates
        posts = posts.filter(
          (p) => !this.posts.some((p2) => p.transaction == p2.transaction)
        );

        this.posts.push(...posts);

        this.$store.commit(
          "updateDisplayNames",
          posts.map((p) => ({
            pub: p.pub,
            uidw: p.uidw,
            displayName: p.displayName,
            nameTime: p.createdAt,
          }))
        );

        $state.loaded();
        console.log(`Infinite Scroll loaded`);

        if (!this.cursor.hasMore()) {
          console.log(`Infinite Scroll does not have any more content`);
          $state.complete();
        }
      } else {
        $state.complete();
      }
    },
  },
};
</script>