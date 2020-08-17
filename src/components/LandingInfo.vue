<template>
  <v-row class="landing-info">
    <v-col :cols="12" no-gutters>
      <v-card color="primary" flat class="rounded-0">
        <v-row no-gutters>
          <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6">
            <v-card color="gray" flat v-if="reveal && $vuetify.breakpoint.mobile" class="rounded-0">
              <v-card-text>
                <slot name="info" v-bind:reveal="reveal"></slot>
                <v-spacer />

                <v-btn dense block text @click="reveal = !reveal">
                  <v-icon>{{ reveal ? 'mdi-close-circle-outline' : 'mdi-plus-circle-outline' }}</v-icon>
                  <span v-show="!reveal">More</span>
                </v-btn>
              </v-card-text>
            </v-card>
            <v-card
              color="primary"
              flat
              class="rounded-0 d-flex justify-center align-center"
              v-else
            >
              <v-card-text>
                <div class="mt-4 mb-4 ml-4 mr-4">
                  <slot name="main"></slot>
                  <v-spacer />
                  <v-btn class="mt-4" dense text @click="reveal = !reveal">
                    <v-icon>{{ reveal ? 'mdi-close-circle-outline' : 'mdi-plus-circle-outline' }}</v-icon>
                    <span v-show="!reveal">More</span>
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col v-if="!$vuetify.breakpoint.mobile" :cols="6">
            <v-card color="gray" flat class="rounded-0 d-flex justify-center align-center">
              <slot name="info" :reveal="reveal"></slot>
            </v-card>
          </v-col>
        </v-row>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: "LandingInfo",
  components: {},
  props: {},
  data: () => ({
    reveal: false,
  }),
};
</script>

<style scoped lang="scss">
.landing-info {
  .v-card {
    height: 450px;
  }
  .v-btn {
    padding: 0;
    min-width: 0;
  }
}
</style>