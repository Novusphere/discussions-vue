<template>
  <BrowsePageLayout v-if="publicKey">
    <template v-slot:header>
      <UserProfileCard flat no-view :displayName="displayName" :publicKey="publicKey" :uidw="uidw">
        <span class="d-block text-center">{{ followers }} followers</span>
      </UserProfileCard>
    </template>
    <template v-slot:header2>
      <v-tabs v-model="tab" class="no-underline mt-1">
        <v-tab :to="`/u/${$route.params.who}/blog`">
          <span>Blog</span>
        </v-tab>
        <v-tab :to="`/u/${$route.params.who}/posts`">
          <span>{{ $vuetify.breakpoint.mobile ? '' : posts }} Posts</span>
        </v-tab>
        <v-tab :to="`/u/${$route.params.who}/threads`">
          <span>{{ $vuetify.breakpoint.mobile ? '' : threads }} Threads</span>
        </v-tab>
        <v-tab :to="`/u/${$route.params.who}/following`">
          <span>Following</span>
        </v-tab>
      </v-tabs>
    </template>
    <template v-slot:content>
      <div v-if="cursor">
        <PostBrowser ref="browser" :cursor="cursor">
          <template v-slot:body></template>
        </PostBrowser>
      </div>
      <div v-else>
        <div v-for="(fu, i) in followingUsers" :key="i">
          <UserProfileCard :displayName="fu.displayName" :publicKey="fu.pub" :uidw="fu.uidw"></UserProfileCard>
        </div>
      </div>
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState } from "vuex";
import BrowsePageLayout from "@/components/BrowsePageLayout";
//import PostSubmitter from "@/components/PostSubmitter";
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
    //PostSubmitter,
    PostBrowser,
    UserProfileCard
  },
  props: {},
  watch: {
    "$route.params.who": function() {
      this.setCursor();
    },
    "$route.params.tab": function() {
      const tabs = ["blog", "posts", "threads", "following"];
      const tab = tabs.find(t => t == this.$route.params.tab);
      this.tab = tab > -1 ? tab : 0;

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
    tab: 0,
    uidw: "",
    displayName: "",
    publicKey: "",
    cursor: null,
    followers: 0,
    following: [],
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
      const info = await getUserProfile(publicKey);

      this.uidw = info.uidw;
      this.publicKey = publicKey;
      this.displayName = info.displayName;
      this.followers = info.followers;
      this.posts = info.posts;
      this.threads = info.threads;
      this.followingUsers = info.followingUsers || [];

      //console.log(info);

      if (this.$route.params.tab == "following") {
        this.cursor = null;
      } else {
        let cursor = undefined;

        if (this.isBlog) {
          // search query is our public key, and has the "blog" tag
          cursor = searchPostsByKeys([publicKey], undefined, true);
          let { $match } = cursor.pipeline[0];
          $match.tags = { $in: ["blog"] };
        } else {
          cursor = searchPostsByKeys([publicKey], "recent", this.isThreads);
        }

        // enable this since we might not be dealing with only top level posts, we need the op to determine the link to the post
        cursor.includeOpeningPost = true;
        cursor.votePublicKey = this.votePublicKey;

        this.cursor = cursor;
        if (this.$refs.browser) {
          this.$refs.browser.reset(cursor);
        }
      }
    }
  }
};
</script>

<style scoped>
.no-underline a {
  text-decoration: none;
}
</style>