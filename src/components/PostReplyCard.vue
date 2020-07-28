<template>
  <div>
    <PostCard
      ref="postCard"
      :clickable="clickable"
      :post="reply.post"
      :display="display"
      :editing="editing"
      @submit-post="submitPost"
    >
      <template v-slot:editor>
        <PostSubmitter
          edit
          :title-field="(reply.post.uuid == reply.post.threadUuid)"
          :parent-post="reply.post"
          cancelable
          @cancel="editing = false"
          ref="editor"
          @submit-post="submitPost"
        />
      </template>
      <template v-slot:actions="{ tip }">
        <PostCardActions
          v-if="reply.post.transaction"
          :post="reply.post"
          :isCommentDisplay="true"
          @reply="!isLoggedIn ? $store.commit('setLoginDialogOpen', true) : (showSubmitter = true)"
          @edit="startEditing()"
          @tip="tip"
        />
      </template>
      <template v-slot:replies>
        <div v-if="showSubmitter" class="ml-1 mr-1 mb-3">
          <PostSubmitter
            ref="submitter"
            :parent-post="reply.post"
            cancelable
            @cancel="showSubmitter = false"
            @submit-post="submitPost"
          />
        </div>
        <PostReplyCard
          ref="replies"
          v-for="(r) in reply.replies"
          :clickable="clickable"
          :key="r.post.transaction"
          :reply="r"
          @submit-post="submitPost"
        />
      </template>
    </PostCard>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import PostSubmitter from "@/components/PostSubmitter";
import PostCardActions from "@/components/PostCardActions";
import PostCard from "@/components/PostCard";

//import { getSinglePost } from "@/novusphere-js/discussions/api";
//import { waitFor } from "@/novusphere-js/utility";

export default {
  name: "PostReplyCard",
  components: {
    PostCard,
    PostSubmitter,
    PostCardActions,
  },
  props: {
    clickable: Boolean,
    reply: Object,
    display: { type: String, default: "comment" },
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
  },
  data() {
    return {
      showSubmitter: false,
      editing: false,
    };
  },
  methods: {
    startEditing() {
      this.editing = true;
      this.$refs.editor.setEditorContent(
        this.reply.post.title,
        this.reply.post.content
      );
    },
    hasUnsavedInput() {
      return (
        (this.$refs.submitter && this.$refs.submitter.hasUnsavedInput()) ||
        (this.$refs.replies &&
          this.$refs.replies.some((r) => r.hasUnsavedInput()))
      );
    },
    submitPost({ post, transferActions }) {
      this.showSubmitter = false;
      this.editing = false;
      this.$emit("submit-post", { post, transferActions });
    },
  },
};
</script>