<template>
  <BrowsePageLayout>
    <template v-slot:header v-if="community">
      <CommunityCard flat no-view :community="community" v-if="community" />
    </template>
    <template v-slot:content>
      <v-progress-linear v-if="waitSubmit" indeterminate></v-progress-linear>
      <v-card v-else>
        <v-card-text>
          <PostSubmitter :sub="tag" ref="submitter" :title-field="true" @reply="submitPost" />
        </v-card-text>
      </v-card>
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapGetters } from "vuex";
import { getCommunities, getSinglePost } from "@/novusphere-js/discussions/api";
import { waitFor, sleep } from "@/novusphere-js/utility";

import BrowsePageLayout from "@/components/BrowsePageLayout";
import CommunityCard from "@/components/CommunityCard";
import PostSubmitter from "@/components/PostSubmitter";

export default {
  name: "SubmitPostPage",
  components: {
    BrowsePageLayout,
    CommunityCard,
    PostSubmitter
  },
  props: {},
  watch: {
    async editorTags() {
      await this.setTag();
    },
    isLoggedIn() {
      if (!this.isLoggedIn) this.$router.push(`/`);
    }
  },
  computed: {
    ...mapGetters(["isLoggedIn"])
  },
  data: () => ({
    tag: "all",
    community: null,
    editorTags: [],
    stopSyncEditor: false,
    waitSubmit: false
  }),
  async created() {
    if (!this.isLoggedIn) this.$router.push(`/`);
    await this.setTag();

    if (this.tag == "all") {
      this.syncEditorTags();
    }
  },
  async destroyed() {
    this.stopSyncEditor = true;
  },
  mounted() {
    window.addEventListener("beforeunload", this.leaveGuard);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.leaveGuard);
  },
  beforeRouteLeave(to, from, next) {
    if (this.$refs.submitter && this.$refs.submitter.hasInput()) {
      const answer = window.confirm(
        "Do you really want to leave? you have unsaved changes!"
      );
      if (answer) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },
  methods: {
    leaveGuard(e) {
      if (this.$refs.submitter && this.$refs.submitter.hasInput()) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = "";
      }
    },
    async submitPost({ transaction }) {
      this.waitSubmit = true;

      await sleep(1000);

      let post = undefined;
      await waitFor(
        async () => {
          post = await getSinglePost(transaction);
          return post != undefined;
        },
        500,
        5000
      );

      if (post) {
        this.$router.push(`/tag/${post.sub}/${post.getEncodedId()}`);
      } else {
        console.log(`Thread couldnt be found... ${transaction}`);
      }
    },
    async syncEditorTags() {
      if (this.stopSyncEditor) return;
      if (this.$refs.submitter) {
        const editorTags = this.$refs.submitter.getEditor().getTags();
        if (
          this.editorTags.length != editorTags.length ||
          !this.editorTags.every((v, i) => v == editorTags[i])
        ) {
          this.editorTags = editorTags;
        }
      }
      setTimeout(() => this.syncEditorTags(), 1000);
    },
    async setTag() {
      let tag = "all";

      if (this.$route.params.tags) {
        tag = this.$route.params.tags.split(",")[0];
      } else if (this.editorTags.length > 0) {
        tag = this.editorTags[0]; // maybe use the most frequently used tag instead?
      }

      const community = (await getCommunities()).find(t => t.tag == tag);

      this.tag = tag;
      this.community = community ? community : null;
    }
  }
};
</script>