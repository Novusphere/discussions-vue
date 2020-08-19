<template>
  <FullScreenDialog v-model="showing">
    <v-card v-if="showing">
      <v-card-title class="justify-end align-end text-right">
        <v-btn text class="mr-4" @click="showing = false">
          <v-icon>close</v-icon>Close
        </v-btn>
      </v-card-title>
      <v-card-text :class="{ 'dark': darkMode, 'light': !darkMode }">
        <v-carousel
          height="90vh"
          v-model="currentIndex"
          :touch="{ left: () => inc(1), right: () => inc(-1) }"
        >
          <v-carousel-item
            class="viewe"
            v-for="(src, i) in images"
            :key="i"
            reverse-transition="fade-transition"
            transition="fade-transition"
          >
            <v-row class="fill-height" align="center" justify="center">
              <img class="viewer-item" :src="src" />
            </v-row>
          </v-carousel-item>
        </v-carousel>
      </v-card-text>
    </v-card>
  </FullScreenDialog>
</template>

<script>
import { mapState } from "vuex";
import FullScreenDialog from "@/components/FullScreenDialog";

export default {
  name: "ImageViewer",
  components: {
    FullScreenDialog,
  },
  props: {
    images: Array,
  },
  data: () => ({
    currentIndex: 0,
    showing: false,
  }),
  computed: {
    ...mapState({
      darkMode: (state) => state.darkMode,
    }),
    carouselHeight() {
      return `${Math.floor(window.innerHeight * 0.9)}px`;
    },
  },
  methods: {
    inc(n) {
      this.currentIndex = Math.min(
        Math.max(this.currentIndex + n, 0),
        this.images.length - 1
      );
    },
    show() {
      this.currentIndex = 0;
      this.showing = true;
    },
  },
};
</script>

<style scoped>
.viewer-item {
  max-height: 80vh;
}
</style>