<template>
  <v-list>
    <v-list-item>
      <v-text-field
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
    <v-list-item>
      <v-btn class="justify-start" block text left :to="'/tests'">
        <v-icon>assessment</v-icon>
        <span>Testing</span>
      </v-btn>
    </v-list-item>
    <v-list-item>
      <v-btn class="justify-start" block text left @click="isLoggedIn ? $router.push(`/settings`) : $store.commit('setLoginDialogOpen', true)">
        <v-icon>settings</v-icon>
        <span>Settings</span>
      </v-btn>
    </v-list-item>
    <div v-show="$vuetify.breakpoint.mobile">
      <v-list-item>
        <v-btn text @click="$vuetify.theme.dark = !$vuetify.theme.dark">
          <v-icon>brightness_high</v-icon>
          <span>{{ $vuetify.theme.dark ? `Light` : `Dark` }} Mode</span>
        </v-btn>
      </v-list-item>
      <v-list-item v-if="isLoggedIn">
        <v-btn text @click="$router.push(`/logout`)">
          <v-icon>power_settings_new</v-icon>
          <span>Log out</span>
        </v-btn>
      </v-list-item>
    </div>
    <v-spacer></v-spacer>
    <slot></slot>
    <v-spacer></v-spacer>
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
    <v-list-item v-for="(tag, i) in subscribedTags" :key="i">
      <TagLink :tag="tag" />
      <v-btn absolute right icon color="error" @click="removeTag(tag)">
        <v-icon>clear</v-icon>
      </v-btn>
    </v-list-item>
  </v-list>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import TagLink from "@/components/TagLink";

export default {
  name: "AppNav",
  components: {
    TagLink
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
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      subscribedTags: state => state.subscribedTags
    })
  },
  created() {},
  methods: {
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
