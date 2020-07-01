<template>
  <v-card v-if="!post.isSpam || !hideSpam" :class="`post-card-${post.transaction}`" outlined>
    <v-row no-gutters class="overline">
      <div class="pl-3 mt-1">
        <div class="d-inline-block pr-3" v-if="!$vuetify.breakpoint.mobile">
          <v-btn icon @click="expanded = expanded ? 0 : -1">
            <v-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</v-icon>
          </v-btn>
        </div>
        <div class="d-inline">
          <div
            class="d-inline-block pr-3"
            v-if="(!$vuetify.breakpoint.mobile && !post.threadTree) || (isCommentDisplay && isThread) || (isBrowsing && isMultiTag)"
          >
            <TagLink :tag="post.sub" />
          </div>
          <div class="d-inline-block pr-3">
            <UserProfileLink :displayName="post.displayName" :publicKey="post.pub" />
          </div>
        </div>
        <div class="d-inline-block pr-3">
          <PostThreadLink :post="post">
            <span v-show="!post.edit">{{ shortTime(post.createdAt) }}</span>
            <span v-show="post.edit">
              <v-icon dense small>edit</v-icon>
              {{ shortTime(post.editedAt) }}
            </span>
          </PostThreadLink>
        </div>
        <div class="d-inline-block pr-3" v-if="post.isPinned || post.isSpam || post.isNSFW">
          <v-icon v-if="post.isPinned" color="success">push_pin</v-icon>
          <v-icon v-if="post.isSpam" color="error">error</v-icon>
          <v-chip v-if="post.isNSFW" small color="orange" text-color="white">18+</v-chip>
        </div>
        <div class="d-inline-block pr-3">
          <PostTips class="d-inline" :post="post" />
        </div>
      </div>
    </v-row>

    <div v-show="!editing">
      <div v-if="post.isSpam && !forceReveal">
        <v-row>
          <v-col :cols="12" align="center" justify="center">
            <v-btn color="error" @click="forceReveal = true, expanded = 0">Reveal Spam?</v-btn>
          </v-col>
        </v-row>
      </div>
      <div v-else>
        <v-row class="headline" v-if="isThread && post.title">
          <v-col cols="12">
            <div class="pl-3 pr-3">
              <PostThreadLink :post="post">{{ post.title }}</PostThreadLink>
            </div>
          </v-col>
        </v-row>

        <v-expansion-panels class="mt-2" flat tile :value="expanded">
          <v-expansion-panel>
            <v-expansion-panel-content>
              <v-card flat @click.native="cardClicked()">
                <div
                  :class="{ 
                    'content-fade': isPreviewDisplay && !isCompactContent, 
                    'nsfw-blur': post.isNSFW && blurNSFW && !removeNSFWOverlay }"
                >
                  <div class="post-html" v-html="postHTML"></div>
                </div>
              </v-card>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
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
import { mapState } from "vuex";
import { formatDistance } from "date-fns";
import { refreshOEmbed } from "@/novusphere-js/utility";

import UserProfileLink from "@/components/UserProfileLink";
import TagLink from "@/components/TagLink";
//import TagIcon from "@/components/TagIcon";
//import PublicKeyIcon from "@/components/PublicKeyIcon";
import PostCardActions from "@/components/PostCardActions";
import PostTips from "@/components/PostTips";
import PostThreadLink from "@/components/PostThreadLink";
import PostSubmitter from "@/components/PostSubmitter";

export default {
  name: "BrowsePostCard",
  components: {
    UserProfileLink,
    TagLink,
    //TagIcon,
    //PublicKeyIcon,
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
    shouldShowPostHTML() {
      return true;
    },
    isThread() {
      return this.post.uuid == this.post.threadUuid;
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
    },
    isMultiTag() {
      if (!this.isBrowsing) return false;
      if (!this.$route.params.tags) return true; // assume we're on a multi tag
      const tags = this.$route.params.tags.split(",");
      return tags.length > 1 || (tags.length == 1 && tags[0] == "all");
    },
    isBrowsing() {
      // one of the browsing display modes
      return (
        this.isCompactDisplay || this.isPreviewDisplay || this.isFullDisplay
      );
    },
    ...mapState({
      hideSpam: state => state.hideSpam,
      blurNSFW: state => state.blurNSFW
    })
  },
  watch: {
    "post.content": async function() {
      this.postHTML = await this.post.getContentHTML();
    },
    isCompactDisplay() {
      if (this.isCompactDisplay) this.expanded = -1;
      else this.expanded = 0;
    }
  },
  data: () => ({
    expanded: 0, // 0 is show, -1 is don't show
    postHTML: "",
    editing: false,
    forceReveal: false,
    removeNSFWOverlay: false
  }),
  async mounted() {
    this.postHTML = await this.post.getContentHTML();
  },
  updated() {
    refreshOEmbed();
  },
  methods: {
    shortTime(t) {
      if (!this.$vuetify.breakpoint.mobile)
        return formatDistance(t, new Date(), { addSuffix: true });
      else {
        const delta = Date.now() - t;
        const second = 1000;
        const minute = second * 60;
        const hour = minute * 60;
        const day = hour * 24;

        let unit = (u, s) => {
          const n = Math.max(1, Math.ceil(delta / u));
          return `${n}${s}`;
        };

        if (delta < minute) return unit(second, `s`);
        else if (delta < hour) return unit(minute, `m`);
        else if (delta < day) return unit(hour, `h`);
        else return unit(day, `d`);
      }
    },
    startEdit() {
      this.$refs.editor.setEditorContent(this.post.title, this.post.content);
      this.editing = true;
    },
    onEdit(editedPost) {
      this.editing = false;
      this.$emit("edit", editedPost);
    },
    cardClicked() {
      // reveal the blur if clicked on
      if (this.post.isNSFW && !this.removeNSFWOverlay) {
        this.removeNSFWOverlay = true;
        return;
      }

      // other...
      if (!this.clickable) return;

      let referenceId = undefined;
      let referenceId2 = undefined;
      let sub = undefined;
      let title = undefined;
      if (this.post.op) {
        sub = this.post.op.sub;
        title = this.post.op.getSnakeCaseTitle();
        referenceId = this.post.op.getEncodedId();
        referenceId2 = this.post.getEncodedId();
      } else {
        sub = this.post.sub;
        title = this.post.getSnakeCaseTitle();
        referenceId = this.post.getEncodedId();
      }

      this.$store.commit("setThreadDialogOpen", {
        value: true,
        sub,
        referenceId,
        title,
        referenceId2
      });

      /*let link = `/tag/${this.post.sub}`;
      if (this.post.op && this.post.transaction != this.post.op.transaction) {
        link += `/${this.post.op.getEncodedId()}`;
      }
      link += `/${this.post.getEncodedId()}`;
      this.$router.push(link);*/
    }
  }
};
</script>

<style>
.post-html img,
.post-html iframe {
  min-width: 0px !important; /* instagram override */
  max-width: min(100%, 512px) !important;
}

.post-html a {
  text-decoration: none;
}
</style>

<style scoped>
.post-replies {
  border-left: 2px solid lightgray;
}
.nsfw-blur {
  filter: blur(20px);
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
