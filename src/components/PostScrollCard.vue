<template>
  <div v-if="post.op && post.uuid != post.op.uuid">
    <PostCard :clickable="true" :display="'compact'" :post="post.op">
      <template v-slot:replies>
        <PostReplyCard
          v-if="showReply"
          ref="reply"
          :display="display"
          :clickable="true"
          :reply="comment"
          @submit-post="submitPost"
        />
        <PostCard v-else :clickable="true" :display="display" :post="post">
          <template v-slot:actions>
            <PostCardActions no-edit :post="post" :isCommentDisplay="false" />
          </template>
        </PostCard>
      </template>
    </PostCard>
  </div>
  <div v-else>
    <PostReplyCard
      v-if="showReply"
      ref="reply"
      :clickable="true"
      :display="display"
      :reply="comment"
      @submit-post="submitPost"
    />
    <PostCard v-else :clickable="true" :display="display" :post="post">
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
    comment: null,
  }),
  created() {
    if (this.showReply) {
      let threadTree = { artificial: true };

      let reply = { post: this.post, replies: [] };
      threadTree[this.post.uuid] = reply;
      reply.post.threadTree = threadTree;

      if (this.post.op && this.post.uuid != this.post.op.uuid) {
        reply = { post: this.post.op, replies: [reply] };
        threadTree[this.post.op.uuid] = reply;
        reply.post.threadTree = threadTree;
      }

      // basically, we need to create a pseudo thread the way ThreadBrowser does
      this.comment = threadTree[this.post.uuid];
      this.tree = threadTree;
    }
  },
};
</script>