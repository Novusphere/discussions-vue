<template>
  <BrowsePageLayout v-if="publicKey">
    <template v-slot:header>
      <UserProfileCard flat no-view :displayName="displayName" :publicKey="publicKey" :uidw="uidw">
        <span class="d-block text-center">{{ followers }} followers</span>
      </UserProfileCard>

      <v-row>
        <v-btn text :to="`/u/${$route.params.who}/blog`">Blog</v-btn>
        <v-btn text :to="`/u/${$route.params.who}/posts`">{{ $vuetify.breakpoint.mobile ? '' : posts }} Posts</v-btn>
        <v-btn text :to="`/u/${$route.params.who}/threads`">{{ $vuetify.breakpoint.mobile ? '' : threads }} Threads</v-btn>
      </v-row>
    </template>
    <template v-slot:content>
      <PostBrowser ref="browser" :cursor="cursor" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState } from "vuex";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import UserProfileCard from "@/components/UserProfileCard";
import PostBrowser from "@/components/PostBrowser";
import {
  searchPostsByKeys,
  getUserProfile
} from "@/novusphere-js/discussions/api";

export default {
  name: "UserProfilePage",
  components: {
    BrowsePageLayout,
    PostBrowser,
    UserProfileCard
  },
  props: {},
  watch: {
    "$route.params.who": function() {
      this.setCursor();
    },
    "$route.params.tab": function() {
      this.setCursor();
    },
    async votePublicKey() {
      // reload cursor from votePublicKey perspective
      if (this.votePublicKey) {
        await this.setCursor();
      }
    }
  },
  data: () => ({
    uidw: "",
    displayName: "",
    publicKey: "",
    cursor: null,
    followers: 0,
    posts: 0,
    threads: 0
  }),
  computed: {
    isBlog() {
      return this.$route.params.tab == "blog" || !this.$route.params.tab;
    },
    isThreads() {
      return this.$route.params.tab == "threads";
    },
    ...mapState({
      votePublicKey: state => (state.keys ? state.keys.arbitrary.pub : "")
    })
  },
  async created() {
    await this.setCursor();
  },
  methods: {
    async setCursor() {
      const [, publicKey] = this.$route.params.who.split("-");
      let cursor = undefined;

      if (this.isBlog) {
        // search query is our public key, and has the "blog" tag
        cursor = searchPostsByKeys([publicKey]);
        let { $match } = cursor.pipeline[0];
        $match.tags = { $in: ["blog"] };
      } else {
        cursor = searchPostsByKeys([publicKey], "recent", this.isThreads);
      }

      // enable this since we might not be dealing with only top level posts, we need the op to determine the link to the post
      cursor.includeOpeningPost = true;
      cursor.votePublicKey = this.votePublicKey;

      const info = await getUserProfile(publicKey);

      this.uidw = info.uidw;
      this.publicKey = publicKey;
      this.displayName = info.displayName;
      this.followers = info.followers;
      this.posts = info.posts;
      this.threads = info.threads;

      this.cursor = cursor;
      if (this.$refs.browser) {
        this.$refs.browser.reset(cursor);
      }
    }
  }
};
</script>