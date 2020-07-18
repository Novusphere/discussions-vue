<template>
  <div v-if="post.op && post.uuid != post.op.uuid">
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
import PostCard from "@/components/PostCard";
import PostCardActions from "@/components/PostCardActions";

export default {
  name: "PostScrollCard",
  components: {
    PostCard,
    PostCardActions
  },
  props: {
    post: Object,
    display: String
  },
  data: () => ({})
};
</script>