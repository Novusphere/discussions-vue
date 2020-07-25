<template>
  <div>
    <v-progress-linear v-if="!cursor" indeterminate></v-progress-linear>
    <div v-else>
      <v-row v-if="filter" align="start" justify="start">
        <div class="text-center">
          <v-menu offset-y>
            <template v-slot:activator="{ on, attrs }">
              <v-btn text v-bind="attrs" v-on="on">
                <span>History - {{ filter }}</span>
              </v-btn>
            </template>
            <v-list>
              <v-list-item v-for="(v, i) in filterOptions" :key="i">
                <v-btn text @click="$emit('change-filter', v)">
                  <span>{{ v }}</span>
                </v-btn>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-row>
      <slot name="body"></slot>
      <TransactionScroller ref="scroller" :trxs="trxs" :infinite="infinite" />
    </div>
  </div>
</template>

<script>
import TransactionScroller from "@/components/TransactionScroller";

export default {
  name: "TransactionBrowser",
  components: {
    TransactionScroller,
  },
  props: {
    cursor: Object,
    filter: String,
  },
  data: () => ({
    trxs: [],
    filterOptions: ["all", "sent", "received"],
  }),
  computed: {},
  watch: {},
  async created() {},
  methods: {
    reset() {
      this.trxs = [];
      if (this.$refs.scroller) {
        this.$refs.scroller.reset();
      }
    },
    async infinite($state) {
      console.proxyLog(`TransactionBrowser infinite scroller called`);

      let trxs = undefined;
      try {
        trxs = await this.cursor.next();
      } catch (ex) {
        // error stop loading...
        console.proxyLog(ex);
        $state.complete();
        return;
      }

      if (trxs.length > 0) {
        this.trxs.push(...trxs);
        $state.loaded();
        if (!this.cursor.hasMore()) {
          $state.complete();
        }
      } else {
        $state.complete();
      }
    },
  },
};
</script>