<template>
  <div>
    <v-row
      v-if="false && showWelcomeMessage && !isLoggedIn"
      no-gutters
      :class="`primary darken-2`"
      justify="center"
      align="center"
    >
      <v-col></v-col>
      <v-col align="center">
        <v-btn text small dense class="white--text" :to="'/landing'">Need help getting started?</v-btn>
      </v-col>
      <v-col align="end">
        <v-btn icon @click="dismissWelcome()" class="mr-4 white--text">
          <v-icon>close</v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <v-row v-if="errorText" no-gutters :class="`error darken-2`">
      <v-col :cols="12" align="center">
        <span class="white--text">{{ errorText }}</span>
      </v-col>
    </v-row>
  </div>
</template>

<script>
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
    errorText: "",
  }),
  mounted() {
    // testing purposes
    window.enableWelcomeMessage = () => {
      this.$store.commit("setShowWelcomeMessage", true);
    };
  },
  async created() {
    const pong = await apiRequest(`/v1/api/data/test?ping=pong`);
    if (!pong) return;

    const time = pong.time;

    let delta = Math.abs(Date.now() - time);
    console.log(`Server time delta: ${delta}`);

    if (delta > 59000) {
      this.errorText = `We've detected your system clock may be out of sync. Please enable auto sync for your device or certain functions on Discussions may not work as intended.`
    }
  },
  methods: {
    dismissWelcome() {
      this.$store.commit("setShowWelcomeMessage", false);
    },
  },
};
</script>
