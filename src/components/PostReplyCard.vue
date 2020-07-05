<template>
  <div>
    <PostCard
      :post="reply.post"
      :display="display"
      @reply="!isLoggedIn ? $store.commit('setLoginDialogOpen', true) : (showSubmitter = true)"
      @edit="onEdit"
      @tip="({ uuid, transaction, transferActions }) => $emit('tip', { uuid, transaction, transferActions })"
    >
      <div v-if="!isThread">
        <div v-if="showSubmitter" class="ml-1 mr-1 mb-3">
          <PostSubmitter
            ref="submitter"
            :parent-post="reply.post"
            cancelable
            @cancel="showSubmitter = false"
            @reply="onReply"
          />
        </div>
        <PostReplyCard
          ref="replies"
          v-for="(r) in reply.replies"
          :key="r.post.transaction"
          :reply="r"
          @reply="onReply"
          @edit="onEdit"
          @tip="({ uuid, transaction, transferActions }) => $emit('tip', { uuid, transaction, transferActions })"
        />
      </div>
    </PostCard>

    <div v-if="isThread">
      <v-card class="mt-3">
        <v-card-text>
          <PostSubmitter
            ref="submitter"
            :parent-post="reply.post"
            @cancel="showSubmitter = false"
            @reply="onReply"
          />
        </v-card-text>
      </v-card>
      <PostReplyCard
        ref="replies"
        class="mt-3"
        v-for="(r) in reply.replies"
        :key="r.post.transaction"
        :reply="r"
        @reply="onReply"
        @edit="onEdit"
        @tip="({ uuid, transaction, transferActions }) => $emit('tip', { uuid, transaction, transferActions })"
      />
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import PostSubmitter from "@/components/PostSubmitter";
import PostCard from "@/components/PostCard";

//import { getSinglePost } from "@/novusphere-js/discussions/api";
//import { waitFor } from "@/novusphere-js/utility";

export default {
  name: "PostReplyCard",
  components: {
    PostCard,
    PostSubmitter
  },
  props: {
    reply: Object,
    display: { type: String, default: "comment" }
  },
  computed: {
    isThread() {
      return this.display == "thread";
    },
    ...mapGetters(["isLoggedIn"])
  },
  data() {
    return {
      showSubmitter: this.display == "thread" ? true : false
    };
  },
  methods: {
    hasInput() {
      return (
        (this.$refs.submitter && this.$refs.submitter.hasInput()) ||
        (this.$refs.replies && this.$refs.replies.some(r => r.hasInput()))
      );
    },
    onEdit({ post }) {
      this.$emit("edit", { post });
    },
    onReply({ post, transferActions }) {
      if (!this.isThread) {
        this.showSubmitter = false;
      }
      this.$emit("reply", { post, transferActions });
    }
  }
};
</script>