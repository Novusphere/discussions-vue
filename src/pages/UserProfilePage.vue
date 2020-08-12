<template>
  <BrowsePageLayout no-trending v-if="publicKey">
    <template v-slot:header>
      <UserProfileCard
        v-show="displayName"
        flat
        no-view
        :displayName="displayName"
        :publicKey="publicKey"
        :uidw="uidw"
        :extended-info="profileInfo"
      />
    </template>
    <template v-slot:header2>
      <SocialMediasCard
        v-if="$vuetify.breakpoint.mobile"
        :isMyProfile="isMyProfile"
        :auth="auth"
        class="text-decoration-none mt-1"
        @remove="(name) => auth = auth.filter((a) => a.name != name)"
      />

      <v-tabs center-active show-arrows v-model="tab" class="text-decoration-none mt-1">
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
        <v-tab :to="`/u/${$route.params.who}/followers`">
          <span>Followers</span>
        </v-tab>
      </v-tabs>
    </template>
    <template v-slot:content>
      <div v-if="isBlogSubmit">
        <v-card>
          <v-card-text>
            <PostSubmitter
              cancelable
              :draft="'blog'"
              :sub="'blog'"
              ref="submitter"
              :title-field="true"
              @submit-post="submitPost"
              @cancel="$router.push(`/u/${$route.params.who}/blog`)"
            />
          </v-card-text>
        </v-card>
      </div>
      <div v-else-if="isBlog && keys && publicKey == keys.arbitrary.pub">
        <v-btn block color="primary" :to="`/u/${$route.params.who}/submit`">New Blog</v-btn>
      </div>
      <div v-else-if="isViewFollowing">
        <div v-for="(fu, i) in followingUsers" :key="i">
          <UserProfileCard :displayName="fu.displayName" :publicKey="fu.pub" :uidw="fu.uidw"></UserProfileCard>
        </div>
      </div>
      <div v-else-if="isViewFollowers">
        <v-row align="start" justify="end" class="mb-2" no-gutters>
          <v-btn color="primary" @click="followersRaindrop()">Raindrop</v-btn>
        </v-row>
        <div v-for="(fu, i) in followerUsers" :key="i">
          <UserProfileCard :displayName="fu.displayName" :publicKey="fu.pub" :uidw="fu.uidw"></UserProfileCard>
        </div>
      </div>
      <div v-if="cursor">
        <PostBrowser ref="browser" :cursor="cursor" no-sort>
          <template v-slot:body></template>
        </PostBrowser>
      </div>
    </template>
    <template v-slot:right>
      <SocialMediasCard
        :isMyProfile="isMyProfile"
        :auth="auth"
        class="text-decoration-none mt-1"
        @remove="(name) => auth = auth.filter((a) => a.name != name)"
      />
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import {
  searchPostsByKeys,
  getUserProfile,
  getSinglePost,
} from "@/novusphere-js/discussions/api";
import { sleep, waitFor, getShortPublicKey } from "@/novusphere-js/utility";

import BrowsePageLayout from "@/components/BrowsePageLayout";
import SocialMediasCard from "@/components/SocialMediasCard";
import PostSubmitter from "@/components/PostSubmitter";
import UserProfileCard from "@/components/UserProfileCard";
import PostBrowser from "@/components/PostBrowser";

export default {
  name: "UserProfilePage",
  components: {
    BrowsePageLayout,
    SocialMediasCard,
    PostSubmitter,
    PostBrowser,
    UserProfileCard,
  },
  props: {},
  watch: {
    "$route.params.who": function () {
      this.load();
    },
    "$route.params.tab": function (_, old) {
      if (this.$route.params.tab == "blog" && !old) return;
      if (this.$route.params.tab == "submit" && !old) return;
      if (this.$route.params.tab == "blog" && old == "submit") return;
      if (this.$route.params.tab == "submit" && old == "blog") return;

      const tabs = ["blog", "posts", "threads", "following"];
      let tab = tabs.findIndex((t) => t == this.$route.params.tab);
      if (tab == -1 && this.isBlogSubmit) tab = 0;

      if (tab != this.tab) {
        this.tab = tab > -1 ? tab : 0;
        this.load();
      }
    },
    async isLoggedIn() {
      await this.load();
    },
  },
  data: () => ({
    tab: 0,
    uidw: "",
    displayName: "",
    publicKey: "",
    cursor: null,
    followers: [],
    following: [],
    posts: 0,
    threads: 0,
    profileInfo: null,
    auth: [],
  }),
  computed: {
    isViewFollowers() {
      return this.$route.params.tab == "followers";
    },
    isViewFollowing() {
      return this.$route.params.tab == "following";
    },
    isBlogSubmit() {
      return this.$route.params.tab == "submit";
    },
    isBlog() {
      return (
        !this.$route.params.tab ||
        this.$route.params.tab == "blog" ||
        this.isBlogSubmit
      );
    },
    isThreads() {
      return this.$route.params.tab == "threads";
    },
    isMyProfile() {
      return this.isLoggedIn && this.keys.arbitrary.pub == this.publicKey;
    },
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  async created() {
    await this.load();
  },
  methods: {
    async followersRaindrop() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      const recipients = [];
      for (const { pub, uidw, displayName } of this.followerUsers) {
        if (!pub || !uidw || !displayName) continue; // legacy may not have uidw
        if (pub == this.keys.arbitrary.pub) continue; // self

        recipients.push({
          pub: pub,
          uidw: uidw,
          displayName: displayName,
          memo: `raindrop to ${displayName} from following /u/${this.$route.params.who}`,
        });
      }

      this.$store.commit("setSendTipDialogOpen", {
        value: true,
        recipients: recipients,
      });
    },
    async submitPost({ post }) {
      this.waitSubmit = true;

      await sleep(250);

      const transaction = post.transaction;
      let p = undefined;

      try {
        await waitFor(
          async () => {
            p = await getSinglePost(transaction);
            return p != undefined;
          },
          500,
          10000
        );

        if (p) {
          await this.load(); // reset the cursor so the post shows up in the feed
          this.$router.push(`/u/${this.$route.params.who}/blog`);
        } else {
          console.log(`Thread couldnt be found... ${transaction}`);
        }
      } catch (ex) {
        console.log(ex);
        console.log(`Thread couldnt be found... ${transaction}`);
      }
    },
    async load() {
      const [, publicKey] = this.$route.params.who.split("-");
      const info = await getUserProfile(publicKey);

      this.profileInfo = info;
      this.uidw = info.uidw;
      this.publicKey = info.pub;
      this.displayName = info.displayName;
      this.posts = info.posts;
      this.threads = info.threads;
      this.followerUsers = info.followerUsers || [];
      this.followingUsers = info.followingUsers || [];
      this.auth = info.auth;

      const shortPublicKey = getShortPublicKey(info.pub);
      if (info.displayName && publicKey != shortPublicKey) {
        const tab = this.$route.params.tab || "";
        const path = `/u/${info.displayName}-${shortPublicKey}/${tab}`;
        window.history.replaceState({}, null, path);
      }

      if (this.isViewFollowing || this.isViewFollowers) {
        this.cursor = null;
      } else {
        let cursor = undefined;

        if (this.isBlog) {
          // search query is our public key, and has the "blog" tag
          cursor = searchPostsByKeys([info.pub], undefined, true);
          let { $match } = cursor.pipeline[0];
          $match.tags = { $in: ["blog"] };
        } else {
          cursor = searchPostsByKeys([info.pub], "recent", this.isThreads);
        }
        // enable this since we might not be dealing with only top level posts, we need the op to determine the link to the post
        cursor.includeOpeningPost = true;
        if (this.isLoggedIn) cursor.votePublicKey = this.keys.arbitrary.pub;
        cursor.sort = "recent";

        this.cursor = cursor;
        if (this.$refs.browser) {
          this.$refs.browser.reset(cursor);
        }
      }
    },
  },
};
</script>