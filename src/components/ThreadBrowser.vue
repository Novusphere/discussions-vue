<template>
  <div>
    <v-progress-linear v-if="!opening" indeterminate></v-progress-linear>
    <div v-else>
      <PostReplyCard
        ref="reply"
        class="mt-3"
        :reply="opening"
        :display="'comment'"
        @reply="reply"
        @edit="edit"
      />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
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
    }
  },
  async created() {
    await this.load();
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
        this.isLoggedIn ? this.keys.arbitrary.pub : undefined,
        this.getModeratorKeys,
        sinceTime
      );

      mergeThreadToTree(thread, this.tree);

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
    async goToSubPost() {
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
          // slight delay before we do the scroll since things might still be loading on page
          setTimeout(
            () => this.$vuetify.goTo(`.post-card-${subPost.transaction}`),
            1000
          );
        }
      }
    },
    async edit({ post }) {
      const p = this.tree[post.parentUuid].post;
      if (p) {
        p.content = post.content;
        p.title = post.title;
      }
    },
    async reply({ post, tips }) {
      if (this.tree[post.uuid]) return;

      let artificalTips = tips.map(t => ({
        transaction: post.transaction,
        data: {
          amount: t.amount,
          chain_id: t.chain,
          fee: t.fee,
          from: this.keys.wallet.pub,
          memo: t.memo,
          nonce: t.nonce,
          relayer: "",
          relayer_account: "",
          sig: "",
          to: t.recipientPublicKey
        }
      }));

      const reply = { post, replies: [] };
      this.tree[post.uuid] = reply;

      const parent = this.tree[post.parentUuid];
      parent.replies.unshift(reply);
      parent.post.tips.push(...artificalTips);
    }
  }
};
</script>