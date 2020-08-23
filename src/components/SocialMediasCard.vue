<template>
  <v-card :flat="flat" v-show="auth.length > 0 || isMyProfile ">
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
          <v-btn
            class="ml-1"
            color="primary"
            dense
            small
            @click="connectOAuth('twitter')"
          >Authenticate</v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
import {
  connectOAuth,
  removeOAuth,
  getUserProfile,
} from "@/novusphere-js/discussions/api";
import { userActionsMixin } from "@/mixins/userActions";

export default {
  name: "SocialMediasCard",
  mixins: [userActionsMixin],
  components: {},
  props: {
    auth: { type: Array, default: () => [] },
    isMyProfile: Boolean,
    flat: Boolean,
  },
  data: () => ({
    twitter: null,
    _auth: [],
  }),
  computed: {
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
    this._auth = [...this.auth];
    await this.load();
  },
  methods: {
    async removeOAuth(name) {
      this._auth = this._auth.filter((a) => a.name != name);
      this.$emit("update", this._auth);
      await removeOAuth(this.keys.identity.key, name);
    },
    async connectOAuth(name) {
      if (!this.isLoggedIn) return this.openLoginDialog();

      window.closePageCallback = async () => {
        const profile = await getUserProfile(this.keys.arbitrary.pub);
        console.log(profile);

        this._auth = profile.auth;
        this.$emit("update", this._auth);
      };

      const callback = `${window.location.protocol}//${window.location.host}/close`;
      await connectOAuth(this.keys.identity.key, name, callback);
    },
    async load() {
      this.twitter = this.auth.find((a) => a.name == "twitter");
    },
  },
};
</script>