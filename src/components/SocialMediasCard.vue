<template>
  <v-card v-show="auth.length > 0 || isMyProfile ">
    <v-card-text>
      <v-row no-gutters>
        <v-col v-if="twitter">
          <v-icon>mdi-twitter</v-icon>
          <a
            :href="`https://twitter.com/${twitter.username}`"
            target="_blank"
            class="ml-1"
          >@{{ twitter.username }}</a>
          <v-btn v-show="isMyProfile" icon color="error" @click="removeOAuth('twitter')">
            <v-icon>clear</v-icon>
          </v-btn>
        </v-col>
        <v-col v-else-if="isMyProfile">
          <v-icon>mdi-twitter</v-icon>
          <v-btn class="ml-1" color="primary" dense small @click="connectOAuth('twitter')">Connect</v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { connectOAuth, removeOAuth } from "@/novusphere-js/discussions/api";

export default {
  name: "SocialMediasCard",
  components: {},
  props: {
    auth: { type: Array, default: () => [] },
    isMyProfile: Boolean,
  },
  data: () => ({
    twitter: null,
  }),
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  watch: {
    async auth() {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async removeOAuth(name) {
      this.$emit("remove", name);
      await removeOAuth(this.keys.identity.key, name);
    },
    async connectOAuth(name) {
      await connectOAuth(this.keys.identity.key, name);
    },
    async load() {
      this.twitter = this.auth.find((a) => a.name == "twitter");
    },
  },
};
</script>