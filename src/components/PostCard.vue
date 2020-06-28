<template>
  <v-card :class="`post-card-${post.transaction}`" outlined>
    <v-row no-gutters class="overline">
      <div class="d-inline pl-3">
        <v-btn icon @click="expanded = !expanded">
          <v-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</v-icon>
        </v-btn>
      </div>
      <div class="d-inline pl-3" v-if="!isCommentDisplay">
        <TagLink :tag="post.sub" />
      </div>
      <div class="d-inline pl-3">
        <UserProfileLink :displayName="post.displayName" :publicKey="post.pub" />
      </div>
      <div class="d-inline pl-3">
        <PostThreadLink :post="post">
          <span v-show="!post.edit">{{ post.createdAt | moment("from") }}</span>
          <span v-show="post.edit">
            <v-icon dense small>edit</v-icon>
            {{ post.editedAt | moment("from")}}
          </span>
        </PostThreadLink>
      </div>

      <v-spacer></v-spacer>

      <div class="d-inline pr-3" v-if="!$vuetify.breakpoint.mobile">
        <PostTips :post="post" />
      </div>
    </v-row>

    <div v-show="!editing">
      <v-row class="headline" v-if="!isCommentDisplay && post.title">
        <v-col cols="12">
          <div class="pl-3">
            <PostThreadLink :post="post">{{ post.title }}</PostThreadLink>
          </div>
        </v-col>
      </v-row>

      <v-expansion-panels flat tile :value="expanded ? 0 : -1">
        <v-expansion-panel>
          <v-expansion-panel-content>
            <v-card flat @click.native="cardClicked()">
              <div
                :class="{ 'content-fade': isPreviewDisplay && !isCompactContent }"
                v-if="!isCompactDisplay || isCompactContent"
              >
                <div class="post-html" v-html="postHTML"></div>
              </div>
            </v-card>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <div v-show="editing">
      <v-card-text>
        <PostSubmitter
          edit
          :title-field="isThread"
          :parent-post="post"
          cancelable
          @cancel="editing = false"
          ref="editor"
          @edit="onEdit"
        />
      </v-card-text>
    </div>

    <PostCardActions
      :post="post"
      :isCommentDisplay="isCommentDisplay"
      @reply="$emit('reply')"
      @edit="startEdit()"
    />

    <div class="post-replies ml-1">
      <slot></slot>
    </div>
  </v-card>
</template>

<script>
import UserProfileLink from "@/components/UserProfileLink";
import TagLink from "@/components/TagLink";
import PostCardActions from "@/components/PostCardActions";
import PostTips from "@/components/PostTips";
import PostThreadLink from "@/components/PostThreadLink";
import PostSubmitter from "@/components/PostSubmitter";
import { refreshOEmbed } from "@/novusphere-js/utility";

export default {
  name: "BrowsePostCard",
  components: {
    UserProfileLink,
    TagLink,
    PostCardActions,
    PostTips,
    PostThreadLink,
    PostSubmitter
  },
  props: {
    clickable: Boolean,
    post: Object,
    comments: Array,
    display: String
  },
  computed: {
    isThread() {
      return this.uuid == this.threadUuid;
    },
    isCompactContent() {
      return this.post.content.length <= 300;
    },
    isCommentDisplay() {
      return this.display == "comment";
    },
    isCompactDisplay() {
      return this.display == "compact";
    },
    isPreviewDisplay() {
      return this.display == "preview";
    },
    isFullDisplay() {
      return this.display == "full";
    }
  },
  watch: {
    "post.content": async function() {
      this.postHTML = await this.post.getContentHTML();
    }
  },
  data: () => ({
    expanded: true,
    postHTML: "",
    editing: false
  }),
  async mounted() {
    this.postHTML = await this.post.getContentHTML();
  },
  updated() {
    refreshOEmbed();
  },
  methods: {
    startEdit() {
      this.$refs.editor.setEditorContent(this.post.title, this.post.content);
      this.editing = true;
    },
    onEdit(editedPost) {
      this.editing = false;
      this.$emit("edit", editedPost);
    },
    cardClicked() {
      if (!this.clickable) return;

      const link = `/tag/${this.post.sub}/${this.post.getEncodedId()}`;
      this.$router.push(link);
    }
  }
};
</script>

<style>
.post-html img,
.post-html iframe {
  max-width: 512px;
}

.post-html a {
  text-decoration: none;
}
</style>

<style scoped>
.post-replies {
  border-left: 2px solid lightgray;
}

.content-fade {
  position: relative;
  max-height: 320px;
  overflow: hidden;
}
.content-fade:after {
  pointer-events: none;
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-image: linear-gradient(
    rgba(255, 255, 255, 0) 50%,
    rgba(255, 255, 255, 1) 100%
  );
}
</style>
