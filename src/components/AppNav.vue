<template>
  <v-list>
    <v-list-item v-if="$vuetify.breakpoint.mobile && isLoggedIn">
      <UserProfileLink btn :displayName="displayName" :publicKey="keys.arbitrary.pub" />
    </v-list-item>
    <v-list-item>
      <v-text-field
        dense
        hide-details
        append-icon="search"
        class="mt-3"
        v-model="search"
        label="Search"
        rounded
        outlined
        @keydown.enter="goSearch()"
        @click:append="goSearch()"
      ></v-text-field>
    </v-list-item>
    <v-list-item>
      <v-btn
        class="justify-start"
        block
        text
        left
        @click="isLoggedIn ? $router.push(`/feed`) : $store.commit('setLoginDialogOpen', true)"
      >
        <v-icon>account_circle</v-icon>
        <span>Feed</span>
      </v-btn>
    </v-list-item>
    <v-list-item>
      <v-btn class="justify-start" block text left :to="'/tag/all'">
        <v-icon>whatshot</v-icon>
        <span>Trending</span>
      </v-btn>
    </v-list-item>
    <v-list-item>
      <v-btn
        class="justify-start"
        block
        text
        left
        @click="isLoggedIn ? $router.push(`/wallet`) : $store.commit('setLoginDialogOpen', true)"
      >
        <v-icon>account_balance_wallet</v-icon>
        <span>Wallet</span>
      </v-btn>
    </v-list-item>
    <v-list-item>
      <v-btn class="justify-start" block text left :to="'/community'">
        <v-icon>group</v-icon>
        <span>Community</span>
      </v-btn>
    </v-list-item>
    <v-list-item v-show="isTester">
      <v-btn class="justify-start" block text left :to="'/tests'">
        <v-icon>assessment</v-icon>
        <span>Testing</span>
      </v-btn>
    </v-list-item>
    <v-list-item>
      <v-btn
        class="justify-start"
        block
        text
        left
        @click="isLoggedIn ? $router.push(`/settings`) : $store.commit('setLoginDialogOpen', true)"
      >
        <v-icon>settings</v-icon>
        <span>Settings</span>
      </v-btn>
    </v-list-item>
    <div v-show="$vuetify.breakpoint.mobile">
      <v-list-item>
        <v-btn text @click="$store.commit('setDarkMode', !darkMode)">
          <v-icon>brightness_high</v-icon>
          <span>{{ darkMode ? `Light` : `Dark` }} Mode</span>
        </v-btn>
      </v-list-item>
      <v-list-item v-if="isLoggedIn">
        <v-btn text @click="$router.push(`/logout`)">
          <v-icon>power_settings_new</v-icon>
          <span>Log out</span>
        </v-btn>
      </v-list-item>
    </div>
    <v-list-item v-if="!$vuetify.breakpoint.mobile">
      <v-btn block color="primary" @click="createPost()">New Post</v-btn>
    </v-list-item>
    <v-divider />
    <v-subheader>My Communities</v-subheader>
    <v-list-item v-show="false">
      <v-text-field
        append-icon="add"
        class="mt-3"
        v-model="subscribeTag"
        label="Subscribe"
        persistent-hint
        hint="Subscribe to new a new tag"
        rounded
        outlined
        @keydown.enter="subscribe()"
        @click:append="subscribe()"
      ></v-text-field>
    </v-list-item>
    <v-list-item v-for="(tag) in subscribedTags" :key="tag">
      <span class="nav-tag">
        <TagLink :tag="tag" />
      </span>
      <v-btn absolute right icon color="error" @click="removeTag(tag)" v-show="false">
        <v-icon>clear</v-icon>
      </v-btn>
    </v-list-item>
  </v-list>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import TagLink from "@/components/TagLink";
import UserProfileLink from "@/components/UserProfileLink";

export default {
  name: "AppNav",
  components: {
    TagLink,
    UserProfileLink
  },
  data() {
    return {
      search: this.$route.query.q || "",
      subscribeTag: ""
    };
  },
  watch: {
    "$route.query.q": function() {
      this.search = this.$route.query.q;
    }
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isTester"]),
    ...mapState({
      darkMode: state => state.darkMode,
      subscribedTags: state => state.subscribedTags,
      keys: state => state.keys,
      displayName: state => state.displayName
    })
  },
  created() {},
  methods: {
    async createPost() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      try {
        if (this.$route.params.tags) {
          // only take a single tag
          const tag = this.$route.params.tags.split(",")[0];
          await this.$router.push(`/tag/${tag}/submit`);
        } else {
          await this.$router.push(`/submit`);
        }
      } catch (ex) {
        return; // Avoided redundant navigation
      }
    },
    async goSearch() {
      this.$router.push(`/search?q=${this.search}`);
    },
    async removeTag(tag) {
      this.$store.commit("unsubscribeTag", tag);
    },
    async subscribe() {
      if (this.subscribeTag.length < 3) return;
      this.$store.commit("subscribeTag", this.subscribeTag);
      this.subscribeTag = "";
    }
  }
};
</script>

<style scoped>
.nav-tag {
  text-overflow: ellipsis;

  /* Required for text-overflow to do anything */
  white-space: nowrap;
  overflow: hidden;
}
</style>