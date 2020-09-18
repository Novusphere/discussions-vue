<template>
  <v-list>
    <v-list-item v-if="$vuetify.breakpoint.mobile && isLoggedIn">
      <UserProfileLink btn :displayName="displayName" :publicKey="keys.arbitrary.pub" />
    </v-list-item>
    <v-list-item>
      <v-text-field
        type="search"
        autocomplete="new-password"
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
        :readonly="searchReadonly"
        @focus="searchFocus()"
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
        text
        style="width: 90%"
        left
        @click="isLoggedIn ? $router.push(`/wallet`) : $store.commit('setLoginDialogOpen', true)"
      >
        <v-icon>account_balance_wallet</v-icon>
        <span>Wallet</span>
      </v-btn>
      <v-btn icon v-if="isLoggedIn" @click="walletMore = !walletMore">
        <v-icon>{{ walletMore ? 'expand_less' : 'expand_more' }}</v-icon>
      </v-btn>
    </v-list-item>
    <v-list-item v-if="walletMore">
      <v-list>
        <v-list-item>
          <v-btn class="justify-start" text block left @click="$router.push(`/wallet/deposit`)">
            <span>Deposit</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn class="justify-start" text block left @click="$router.push(`/wallet/withdraw`)">
            <span>Withdraw</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn class="justify-start" text block left @click="$router.push(`/wallet/swap`)">
            <span>Swap</span>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-list-item>
    <v-list-item>
      <v-btn class="justify-start" block text left :to="'/discover'">
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
    <v-subheader>
      My Communities
      <v-btn icon @click="editCommunities = !editCommunities">
        <v-icon>edit</v-icon>
      </v-btn>
    </v-subheader>
    <v-list-item v-for="(tag) in subscribedTags" :key="tag">
      <span class="text-decoration-ellipsis">
        <TagLink :tag="tag" />
      </span>
      <div style="position: absolute; right: 0px;">
        <v-btn icon color="primary" @click="orientTag(tag, true)" v-if="editCommunities">
          <v-icon>arrow_upward</v-icon>
        </v-btn>
        <v-btn icon color="primary" @click="orientTag(tag, false)" v-if="editCommunities">
          <v-icon>arrow_downward</v-icon>
        </v-btn>
      </div>
    </v-list-item>
  </v-list>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { userActionsMixin } from "@/mixins/userActions";
import TagLink from "@/components/TagLink";
import UserProfileLink from "@/components/UserProfileLink";

export default {
  name: "AppNav",
  mixins: [userActionsMixin],
  components: {
    TagLink,
    UserProfileLink,
  },
  data() {
    return {
      editCommunities: false,
      search: this.$route.query.q || "",
      searchReadonly: true,
      walletMore: false,
    };
  },
  watch: {
    "$route.query.q": function () {
      this.search = this.$route.query.q || "";
    },
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isTester"]),
    ...mapState({
      darkMode: (state) => state.darkMode,
      subscribedTags: (state) => state.subscribedTags,
      keys: (state) => state.keys,
      displayName: (state) => state.displayName,
    }),
  },
  created() {},
  methods: {
    searchFocus() {
      this.searchReadonly = false;
      const [textInput] = this.$el.getElementsByTagName("input");
      if (textInput.hasAttribute("readonly")) {
        textInput.removeAttribute("readonly");
        // safari mobile fix
        textInput.blur();
        textInput.focus();
      }
    },
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
        } else if (this.$route.params.who && this.isLoggedIn) {
          const who = `${this.displayName}-${this.keys.arbitrary.pub}`;
          await this.$router.push(`/u/${who}/submit`);
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
  },
};
</script>