<template>
  <div>
    <v-progress-linear v-if="!opening" indeterminate></v-progress-linear>
    <div v-else>
      <PostReplyCard
        ref="reply"
        class="mt-3"
        :reply="opening"
        :display="'thread'"
        @reply="reply"
        @edit="edit"
      />
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
//import PostSubmitter from "@/components/PostSubmitter";
//import PostCard from "@/components/PostCard";
import PostReplyCard from "@/components/PostReplyCard";
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
    referenceId: String
  },
  data: () => ({
    opening: null,
    tree: null,
    checkForPosts: true
  }),
  computed: {
    ...mapState({
      votePublicKey: state => (state.keys ? state.keys.arbitrary.pub : "")
    })
  },
  watch: {
    async votePublicKey() {
      // reload thread from votePublicKey perspective
      if (this.votePublicKey) {
        await this.loadThread();
      }
    }
  },
  async created() {
    await this.loadThread();
    await this.mergeNewComments();
  },
  async destroyed() {
    this.checkForPosts = false;
  },
  async updated() {
    await this.goToSubPost();
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
        this.votePublicKey,
        sinceTime
      );

      mergeThreadToTree(thread, this.tree);

      setTimeout(() => this.mergeNewComments(), 3000);
    },
    async loadThread() {
      const thread = await getThread(this.referenceId, this.votePublicKey);
      const tree = createThreadTree(thread);

      this.opening = tree[thread.opening.uuid];
      this.tree = tree;
    },
    async goToSubPost() {
      const subPostId = this.$route.params.referenceId2;
      if (subPostId) {
        const subPost = await getSinglePost(subPostId);
        if (
          subPost &&
          Object.values(this.tree).find(
            c => c.post.transaction == subPost.transaction
          )
        ) {
          // slight delay before we do the scroll since things might still be loading on page
          setTimeout(
            () => this.$vuetify.goTo(`.post-card-${subPost.transaction}`),
            1000
          );
        }
      }
    },
    async edit(editPost) {
      const { post } = this.tree[editPost.parentUuid];
      if (post) {
        post.content = editPost.content;
        post.title = editPost.title;
      }
    },
    async reply(replyPost) {
      if (this.tree[replyPost.uuid]) return;

      const reply = { post: replyPost, replies: [] };
      this.tree[replyPost.uuid] = reply;
      this.tree[replyPost.parentUuid].replies.unshift(reply);
    }
  }
};
</script>