<template>
  <div>
    <v-progress-linear v-if="!opening" indeterminate></v-progress-linear>
    <div v-else>
      <PostReplyCard ref="reply" :reply="opening" @submit-post="submitPost" />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { submitPostMixin } from "@/mixins/submitPost";
//import PostSubmitter from "@/components/PostSubmitter";
//import PostCard from "@/components/PostCard";
import PostReplyCard from "@/components/PostReplyCard";
import {
  createThreadTree,
  mergeThreadToTree,
  getThread,
  getSinglePost,
  addViewToPost,
} from "@/novusphere-js/discussions/api";
//import { waitFor } from "@/novusphere-js/utility";

export default {
  name: "ThreadBrowser",
  mixins: [submitPostMixin],
  components: {
    PostReplyCard,
    //PostCard,
    //PostSubmitter
  },
  props: {
    referenceId: String,
    referenceId2: String,
  },
  data: () => ({
    opening: null,
    tree: null,
    checkForPosts: true,
    viewed: false,
  }),
  computed: {
    ...mapGetters(["getModeratorKeys", "isLoggedIn", "isBlocked"]),
    ...mapState({
      keys: (state) => state.keys,
      isThreadDialogOpen: (state) => state.isThreadDialogOpen,
      blockedUsers: (state) => state.blockedUsers,
    }),
  },
  watch: {
    async isLoggedIn() {
      // reload perspective
      await this.load();
    },
    async referenceId() {
      await this.load();
      await this.mergeNewComments();
      await this.scrollToPost();
    },
  },
  async created() {
    await this.load();
    await this.mergeNewComments();
    await this.scrollToPost();
  },
  async mounted() {},
  async destroyed() {
    this.checkForPosts = false;
  },
  methods: {
    hasUnsavedInput() {
      return this.$refs.reply.hasUnsavedInput();
    },
    async mergeNewComments() {
      if (!this.checkForPosts) return;

      const sinceTime = Object.values(this.tree)
        .map((c) => c.post)
        .map((p) => Math.max(p.createdAt.getTime(), p.editedAt.getTime()))
        .reduce((t1, t2) => Math.max(t1, t2), 0);

      const thread = await getThread(
        this.referenceId,
        this.isLoggedIn ? this.keys.arbitrary.pub : undefined,
        this.getModeratorKeys,
        sinceTime
      );

      mergeThreadToTree(thread, this.tree);
      this.applyContext(
        this.opening.post,
        Object.values(this.tree).map((c) => c.post)
      );

      this.$store.commit(
        "updateDisplayNames",
        Object.values(this.tree)
          .map((p) => p.post)
          .map((p) => ({
            pub: p.pub,
            uidw: p.uidw,
            displayName: p.displayName,
            nameTime: p.createdAt,
          }))
      );

      setTimeout(() => this.mergeNewComments(), 3000);
    },
    applyContext(op, posts) {
      let blockedUsers = this.blockedUsers;
      if (blockedUsers.find((bu) => bu.pub == op.pub)) {
        // the opening poster is blocked, but we're viewing it, so we need to temporarily unblock this user
        blockedUsers = blockedUsers.filter((bu) => bu.pub != op.pub);
      }

      for (const p of posts) {
        p.blockedUsers = blockedUsers;
      }
    },
    async load() {
      const thread = await getThread(
        this.referenceId,
        this.isLoggedIn ? this.keys.arbitrary.pub : undefined,
        this.getModeratorKeys
      );

      const tree = createThreadTree(thread);
      this.applyContext(
        tree[thread.opening.uuid].post,
        Object.values(tree).map((c) => c.post)
      );

      this.opening = tree[thread.opening.uuid];
      this.tree = tree;

      if (!this.viewed) {
        addViewToPost(thread.opening.uuid);
        this.viewed = true;
      }

      this.$emit("loaded", { opening: this.opening, tree: this.tree });
    },
    async scrollToPost() {
      if (this.isThreadDialogOpen) return;

      const subPostId = this.referenceId2;
      if (subPostId) {
        const subPost = await getSinglePost(subPostId);
        if (
          subPost &&
          this.tree &&
          Object.values(this.tree).find(
            (c) => c.post.transaction == subPost.transaction
          )
        ) {
          this.$vuetify.goTo(`.post-card-${subPost.transaction}`);
        }
      } else {
        this.$vuetify.goTo(`.post-card-${this.opening.post.transaction}`);
      }
    },
  },
};
</script>