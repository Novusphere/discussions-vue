<template>
  <v-app-bar dense app hide-on-scroll clipped-left clipped-right color="secondary">
    <v-row v-if="!$vuetify.breakpoint.mobile">
      <v-col class="d-flex justify-start align-center">
        <v-app-bar-nav-icon @click="$emit('drawer')"></v-app-bar-nav-icon>
        <v-btn text color="primary" :to="'/'">
          <v-img
            alt="Logo"
            class="shrink"
            contain
            src="/static/logo.svg"
            transition="scale-transition"
            width="40"
          />
          <h3 class="ml-2">Discussions</h3>
        </v-btn>
      </v-col>
      <v-col class="d-flex justify-end align-center">
        <v-btn text @click="$store.commit('setDarkMode', !darkMode)">
          <v-icon>brightness_4</v-icon>
        </v-btn>

        <div v-if="!isLoggedIn">
          <v-btn
            text
            color="primary"
            @click="$store.commit('setLoginDialogOpen', true)"
            >Log in</v-btn
          >
        </div>
        <div v-else-if="isLoggedIn">
          <v-btn text @click="createPost()">
            <v-icon>create</v-icon>
          </v-btn>
          <NotificationsButton />
          <v-btn text>
            <UserProfileLink
              :displayName="displayName"
              :publicKey="keys.arbitrary.pub"
            />
          </v-btn>
          <v-btn text @click="$store.commit('logout')">
            <v-icon>power_settings_new</v-icon>
          </v-btn>
        </div>
      </v-col>
    </v-row>
    <v-row no-gutters v-else>
      <v-col class="d-flex align-center justify-center">
        <v-app-bar-nav-icon @click="$emit('drawer')"></v-app-bar-nav-icon>
      </v-col>
      <v-col class="d-flex align-center justify-center">
        <v-btn text color="primary" :to="'/'">
          <v-img
            alt="Logo"
            class="shrink"
            contain
            src="/static/logo.svg"
            transition="scale-transition"
            width="40"
          />
        </v-btn>
      </v-col>
      <v-col class="d-flex align-center justify-center" v-if="!isLoggedIn">
        <v-btn
          text
          small
          dense
          color="primary"
          @click="$store.commit('setLoginDialogOpen', true)"
          >Log in</v-btn
        >
      </v-col>
      <v-col class="d-flex align-center justify-center" v-if="isLoggedIn">
        <v-btn text small dense @click="$router.push('/tag/all')" color="red">
          <v-icon>whatshot</v-icon>
        </v-btn>
      </v-col>
      <v-col class="d-flex align-center justify-center" v-if="isLoggedIn">
        <v-btn text small dense @click="createPost()">
          <v-icon>create</v-icon>
        </v-btn>
      </v-col>
      <v-col class="d-flex align-center justify-center" v-if="isLoggedIn">
        <NotificationsButton text small dense />
      </v-col>
    </v-row>
  </v-app-bar>
</template>

<script>
//import AppNav from "@/components/AppNav";
//import AboutUsCard from "@/components/AboutUsCard";
import UserProfileLink from "@/components/UserProfileLink";
import NotificationsButton from "@/components/NotificationsButton";
import { mapState, mapGetters } from "vuex";

export default {
  name: "AppBar",
  components: {
    //AppNav,
    //AboutUsCard,
    UserProfileLink,
    NotificationsButton,
  },
  watch: {
    $route() {
      this.menu = false;
    },
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      darkMode: (state) => state.darkMode,
      displayName: (state) => state.displayName,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    menu: false,
  }),
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
  },
};
</script>
