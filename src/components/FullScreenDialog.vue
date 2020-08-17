<template>
  <v-dialog
    v-if="!useDialog2"
    v-model="valueProxy"
    scrollable
    fullscreen
    eager
    persistent
    no-click-animation
  >
    <slot></slot>
  </v-dialog>
  <div v-else class="v-dialog2">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: "FullScreenDialog",
  components: {},
  props: {
    value: Boolean,
  },
  computed: {
    valueProxy: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("input", value);
      },
    },
  },
  watch: {
    valueProxy(open) {
      //
      // https://github.com/vuetifyjs/vuetify/issues/3875
      // https://github.com/Novusphere/discussions-vue/issues/158
      //
      if (open) {
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.position = "fixed";
      } else {
        const scrollY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        window.scrollTo({ top: parseInt(scrollY || "0") * -1 });
      }

      if (this.useDialog2) {
        if (open) {
          this.$el.style.width = "100%";
        } else {
          this.$el.style.width = "0%";
        }
      }
    },
  },
  data: () => ({
    useDialog2: true,
  }),
};
</script>

<style lang="scss">
.v-dialog2 {
  height: 100%;
  position: fixed;
  width: 0;
  z-index: 200;
  top: 0;
  left: 0;
  overflow-x: hidden;

  -webkit-overflow-scrolling: touch;

  /* taken from v-dialog--scrollable */
  display: flex;

  /* taken from v-dialog--fullscreen */
  border-radius: 0;
  margin: 0;
  overflow-y: auto;

  > .v-card {
    position: relative;
    width: 100%;

    /* taken from v-dialog--fullscreen */
    min-height: 100%;
    min-width: 100%;
    margin: 0 !important;
    padding: 0 !important;

    /* taken from v-dialog--fullscreen */
    display: flex;
    flex: 1 1 100%;
    flex-direction: column;
    max-height: 100%;
    max-width: 100%;

    > .v-card__title {
      /* taken from v-dialog--fullscreen */
      flex: 0 0 auto;
    }
    > .v-card__text {
      /* taken from v-dialog--fullscreen */
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      flex: 1 1 auto;
      overflow-y: auto;
    }
  }
}
</style>