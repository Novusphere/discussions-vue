<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card flat>
          <img class="md-banner" src="https://i.imgur.com/WO5pb52.png" />
          <v-card-text v-if="this.$slots.header">
            <slot name="header"></slot>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="$vuetify.breakpoint.mobile">
      <v-col cols="12">
        <slot name="content"></slot>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col :cols="noRight ? 12 : 9">
        <v-progress-linear v-if="needSyncAccount" indeterminate></v-progress-linear>
        <slot v-else name="content"></slot>
      </v-col>
      <v-col cols="3" v-if="!noRight">
        <slot name="right"></slot>
        <TrendingCard />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState } from "vuex";
import TrendingCard from "./TrendingCard";

export default {
  name: "BrowsePageLayout",
  components: {
    TrendingCard
  },
  props: {
    noRight: Boolean
  },
  computed: {
    ...mapState({
      needSyncAccount: state => state.needSyncAccount
    })
  },
  data: () => ({
    //
  })
};
</script>

<style lang="scss" scoped>
.md-banner {
  width: 100%;
}
</style>
