<template>
  <v-card flat tile>
    <slot></slot>
    <v-card-text class="text-center pa-0">
      <v-row no-gutters>
        <v-col :cols="12">
          <v-btn icon :href="'https://github.com/Novusphere/'" target="blank">
            <v-icon>mdi-github</v-icon>
          </v-btn>
          <v-btn icon :href="'https://twitter.com/thenovusphere'" target="blank">
            <v-icon>mdi-twitter</v-icon>
          </v-btn>
          <v-btn icon :href="'https://t.me/eosdiscussionsapp'" target="blank">
            <v-icon>mdi-telegram</v-icon>
          </v-btn>
          <v-btn icon :href="'https://discord.com/invite/udb5N4X'" target="blank">
            <v-icon>mdi-discord</v-icon>
          </v-btn>
        </v-col>
        <v-col :cols="12">
          <a
            target="_blank"
            href="https://docs.google.com/document/d/e/2PACX-1vRSHTH1e3eR1IPumj9H63XAP3_QT0kQOd5v2f_9um_3hPHi1PBJaH-XQhoguSBrXv_YdHd4s1BryVhc/pub"
            class="mr-2 d-inline-block"
          >Privacy Policy</a>
          <a
            target="_blank"
            href="https://docs.google.com/document/d/e/2PACX-1vR8X4A-pa3HmsAYm9NCjZQsKLt1Q5kZooZkvHhtusUPU2fr4mi4AL9uIZKrrBNZp-lnBEJMP9Guj4t0/pub"
            class="mr-2 d-inline-block"
          >User Agreement</a>
          <span class="mr-2 d-inline-block">Build {{ version }}</span>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { getBuildVersion } from "@/utility";

export default {
  name: "AboutUsCard",
  components: {},
  props: {},
  data: () => ({
    version: ""
  }),
  created() {
    this.version = getBuildVersion();
  }
};
</script>