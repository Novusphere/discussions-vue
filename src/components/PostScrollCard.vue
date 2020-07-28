<template>
  <div v-if="showReply && opening">
    <PostReplyCard ref="reply" :clickable="true" :reply="opening" @submit-post="submitPost" />
  </div>
  <div v-else-if="post.op && post.uuid != post.op.uuid">
    <PostCard :clickable="true" :display="'compact'" :post="post.op">
      <template v-slot:replies>
        <PostCard :clickable="true" :display="display" :post="post">
          <template v-slot:actions>
            <PostCardActions no-edit :post="post" :isCommentDisplay="false" />
          </template>
        </PostCard>
      </template>
    </PostCard>
  </div>
  <div v-else>
    <PostCard :clickable="true" :display="display" :post="post">
      <template v-slot:actions>
        <PostCardActions no-edit :post="post" :isCommentDisplay="false" />
      </template>
    </PostCard>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { submitPostMixin } from "@/mixins/submitPost";
import PostCard from "@/components/PostCard";
import PostReplyCard from "@/components/PostReplyCard";
import PostCardActions from "@/components/PostCardActions";

export default {
  name: "PostScrollCard",
  mixins: [submitPostMixin],
  components: {
    PostCard,
    PostCardActions,
    PostReplyCard,
  },
  props: {
    post: Object,
    display: String,
    showReply: Boolean,
  },
  computed: {
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    opening: null,
  }),
  created() {
    if (this.showReply) {
      let threadTree = {};

      let reply = { post: this.post, replies: [] };
      threadTree[this.post.uuid] = reply;
      reply.post.threadTree = threadTree;

      if (this.post.op && this.post.uuid != this.post.op.uuid) {
        reply = { post: this.post.op, replies: [reply] };
        threadTree[this.post.op.uuid] = reply;
        reply.post.threadTree = threadTree;
      }

      // basically, we need to create a pseudo thread the way ThreadBrowser does
      this.opening = reply;
      this.tree = threadTree;
    }
  },
};
</script>