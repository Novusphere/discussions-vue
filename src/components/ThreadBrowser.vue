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
//import PostSubmitter from "@/components/PostSubmitter";
//import PostCard from "@/components/PostCard";
import PostReplyCard from "@/components/PostReplyCard";
import { createArtificalTips } from "@/novusphere-js/uid";
import {
  createThreadTree,
  mergeThreadToTree,
  getThread,
  getSinglePost
} from "@/novusphere-js/discussions/api";
//import { waitFor } from "@/novusphere-js/utility";

export default {
  name: "ThreadBrowser",
  components: {
    PostReplyCard
    //PostCard,
    //PostSubmitter
  },
  props: {
    referenceId: String,
    referenceId2: String
  },
  data: () => ({
    opening: null,
    tree: null,
    checkForPosts: true
  }),
  computed: {
    ...mapGetters(["getModeratorKeys", "isLoggedIn"]),
    ...mapState({
      keys: state => state.keys
    })
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
    }
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
    hasInput() {
      return this.$refs.reply.hasInput();
    },
    async mergeNewComments() {
      if (!this.checkForPosts) return;

      const sinceTime = Object.values(this.tree)
        .map(c => c.post)
        .map(p => Math.max(p.createdAt.getTime(), p.editedAt.getTime()))
        .reduce((t1, t2) => Math.max(t1, t2), 0);

      const thread = await getThread(
        this.referenceId,
        this.isLoggedIn ? this.keys.arbitrary.pub : undefined,
        this.getModeratorKeys,
        sinceTime
      );

      mergeThreadToTree(thread, this.tree);

      this.$store.commit(
        "updateDisplayNames",
        Object.values(this.tree)
          .map(p => p.post)
          .map(p => ({
            pub: p.pub,
            uidw: p.uidw,
            displayName: p.displayName,
            nameTime: p.createdAt
          }))
      );

      setTimeout(() => this.mergeNewComments(), 3000);
    },
    async load() {
      const thread = await getThread(
        this.referenceId,
        this.isLoggedIn ? this.keys.arbitrary.pub : undefined,
        this.getModeratorKeys
      );
      const tree = createThreadTree(thread);

      this.opening = tree[thread.opening.uuid];
      this.tree = tree;

      this.$emit("loaded", { opening: this.opening, tree: this.tree });
    },
    async scrollToPost() {
      const subPostId = this.referenceId2;
      if (subPostId) {
        const subPost = await getSinglePost(subPostId);
        if (
          subPost &&
          this.tree &&
          Object.values(this.tree).find(
            c => c.post.transaction == subPost.transaction
          )
        ) {
          this.$vuetify.goTo(`.post-card-${subPost.transaction}`);
        }
      } else {
        this.$vuetify.goTo(`.post-card-${this.opening.post.transaction}`);
      }
    },
    async submitPost({ post, transferActions }) {
      if (post.edit) {
        const p = this.tree[post.parentUuid].post;
        if (p) {
          p.content = post.content;
          p.title = post.title;
        }
      } else {
        if (this.tree[post.uuid]) return;

        const reply = { post, replies: [] };
        this.tree[post.uuid] = reply;
        this.tree[post.parentUuid].replies.unshift(reply);

        if (transferActions && transferActions.length > 0) {
          const parent = this.tree[post.parentUuid];
          if (parent) {
            let artificalTips = await createArtificalTips(
              this.keys.wallet.pub,
              post.transaction,
              transferActions
            );
            parent.post.tips.push(...artificalTips);
          }
        }
      }
    }
  }
};
</script>