<template>
  <div>
    <v-row
      v-if="showWelcomeMessage && !isLoggedIn"
      no-gutters
      :class="`primary darken-2`"
      justify="center"
      align="center"
    >
      <v-col></v-col>
      <v-col align="center">
        <v-btn text small dense class="white--text">Need help getting started?</v-btn>
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
  methods: {
    dismissWelcome() {
      this.$store.commit("setShowWelcomeMessage", false);
    },
  },
};
</script>
