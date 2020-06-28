<template>
  <div>
    <PostCard
      :post="reply.post"
      :display="display"
      @reply="!isLoggedIn ? $store.commit('setLoginDialogOpen', true) : (showSubmitter = true)"
      @edit="onEdit"
    >
      <div v-if="!isThread">
        <div v-if="showSubmitter" class="ml-1 mr-1 mb-3">
          <PostSubmitter
            :parent-post="reply.post"
            cancelable
            @cancel="showSubmitter = false"
            @reply="onReply"
          />
        </div>
        <PostReplyCard
          v-for="(r) in reply.replies"
          :key="r.post.transaction"
          :reply="r"
          @reply="onReply"
          @edit="onEdit"
        />
      </div>
    </PostCard>

    <div v-if="isThread">
      <v-card class="mt-3">
        <v-card-text>
          <PostSubmitter
            :parent-post="reply.post"
            @cancel="showSubmitter = false"
            @reply="onReply"
          />
        </v-card-text>
      </v-card>
      <PostReplyCard
        class="mt-3"
        v-for="(r) in reply.replies"
        :key="r.post.transaction"
        :reply="r"
        @reply="onReply"
        @edit="onEdit"
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
    ...mapGetters(['isLoggedIn']),
  },
  data() {
    return {
      showSubmitter: this.display == "thread" ? true : false
    };
  },
  methods: {
    onEdit(editPost) {
      this.$emit("edit", editPost);
    },
    onReply(replyPost) {
      if (!this.isThread) {
        this.showSubmitter = false;
      }
      this.$emit("reply", replyPost);
    }
  }
};
</script>