<template>
  <v-app-bar app color="secondary">
    <div class="d-flex align-center">
      <v-btn text color="primary" :to="'/'">
        <v-img
          alt="Logo"
          class="shrink mr-2"
          contain
          src="/static/logo.svg"
          transition="scale-transition"
          width="40"
        />

        <h3 v-if="!$vuetify.breakpoint.mobile">Discussions</h3>
      </v-btn>
    </div>

    <v-spacer></v-spacer>

    <v-btn v-if="!$vuetify.breakpoint.mobile" text @click="$store.commit('setDarkMode', !darkMode)">
      <v-icon>brightness_4</v-icon>
    </v-btn>

    <div v-if="!isLoggedIn">
      <v-btn text color="primary" @click="$store.commit('setLoginDialogOpen', true)">Log in</v-btn>
    </div>
    <div v-else-if="isLoggedIn && !$vuetify.breakpoint.mobile">
      <v-btn text @click="createPost()">
        <v-icon>create</v-icon>
      </v-btn>
      <NotificationsButton />
      <v-btn text>
        <UserProfileLink :displayName="displayName" :publicKey="keys.arbitrary.pub" />
      </v-btn>
      <v-btn text @click="$store.commit('logout')">
        <v-icon>power_settings_new</v-icon>
      </v-btn>
    </div>

    <div v-if="$vuetify.breakpoint.mobile">
      <v-btn v-if="isLoggedIn" text @click="createPost()">
        <v-icon>create</v-icon>
      </v-btn>
      <NotificationsButton v-if="isLoggedIn" />
      <v-menu
        offset-y
        v-model="menu"
        :close-on-content-click="false"
        :max-height="$vuetify.breakpoint.height * 0.9"
      >
        <template v-slot:activator="{ on, attrs }">
          <v-btn text v-bind="attrs" v-on="on">
            <v-icon>more_vert</v-icon>
          </v-btn>
        </template>
        <AppNav />
        <AboutUsCard><v-divider /></AboutUsCard>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<script>
import AppNav from "@/components/AppNav";
import AboutUsCard from "@/components/AboutUsCard";
import UserProfileLink from "@/components/UserProfileLink";
import NotificationsButton from "@/components/NotificationsButton";
import { mapState, mapGetters } from "vuex";

export default {
  name: "AppBar",
  components: {
    AppNav,
    AboutUsCard,
    UserProfileLink,
    NotificationsButton
  },
  watch: {
    $route() {
      this.menu = false;
    }
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      darkMode: state => state.darkMode,
      displayName: state => state.displayName,
      keys: state => state.keys
    })
  },
  data: () => ({
    menu: false
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
        } else {
          await this.$router.push(`/submit`);
        }
      } catch (ex) {
        return; // Avoided redundant navigation
      }
    }
  }
};
</script>
