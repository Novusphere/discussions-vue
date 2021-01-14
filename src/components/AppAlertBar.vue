<template>
  <div>
    <v-row
      v-if="alert && (alert.time >= showWelcomeMessage || !isLoggedIn)"
      no-gutters
      :class="`primary darken-2`"
      justify="center"
      align="center"
    >
      <v-col :cols="12" align="center">
        <div class="text-overline">
          <a href="javascript:void(0)" class="white--text text-decoration-none" @click="clickAlert">{{ alert.message }}</a>
          <v-btn class="mr-2 float-right" icon small dense @click="dismissWelcome"><v-icon>close</v-icon></v-btn>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import axios from "axios";
import { mapState, mapGetters } from "vuex";
import { apiRequest } from "@/novusphere-js/discussions/api";

export default {
  name: "AppAlertBar",
  components: {},
  watch: {},
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      showWelcomeMessage: (state) => state.showWelcomeMessage,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    alert: null,
  }),
  mounted() {
    // testing purposes
    window.enableWelcomeMessage = () => {
      this.$store.commit("setShowWelcomeMessage", 0);
    };
  },
  async created() {
    const pong = await apiRequest(`/v1/api/data/test?ping=pong`);
    if (!pong) return;

    const time = pong.time;

    let delta = Math.abs(Date.now() - time);
    console.log(`Server time delta: ${delta}`);

    if (delta > 59000) {
      this.errorText = `We've detected your system clock may be out of sync. Please enable auto sync for your device or certain functions on Discussions may not work as intended.`;
    } else {
      const { data: alert } = await axios.get(
        "https://raw.githubusercontent.com/Novusphere/discussions-app-settings/master/alert.json"
      );
      this.alert = { ...alert };
    }
  },
  methods: {
    clickAlert() {
      if (!this.alert.link) return;
      if (this.alert.link.startsWith("http")) {
        window.location.href = this.alert.link;
      } else {
        this.$router.push(this.alert.link);
      }
    },
    dismissWelcome() {
      this.$store.commit("setShowWelcomeMessage", Date.now());
    },
  },
};
</script>
