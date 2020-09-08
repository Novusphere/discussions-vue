<template>
  <v-card>
    <v-card-text>
      <v-row>
        <v-col cols="12" v-if="ytd">
          <p class="text-center text-h5 font-weight-bold">Year to Date</p>
          <v-row>
            <v-col align="center" justify="center">
              <strong>Posts:</strong>
              {{ ytd.posts }}
            </v-col>
            <v-col align="center" justify="center">
              <strong>Threads:</strong>
              {{ ytd.threads }}
            </v-col>
            <v-col align="center" justify="center">
              <strong>Token Transfers:</strong>
              {{ ytd.trxs.count }}
            </v-col>
          </v-row>

          <v-row>
            <v-col
              align="center"
              justify="center"
              v-for="sym in Object.keys(ytd.trxs.volume)"
              :key="sym"
            >
              <v-btn color="primary" :outlined="volumeSymbol != sym" @click="volumeSymbol = sym">
                <strong>{{ sym }}:</strong>
                {{ ytd.trxs.volume[sym].toFixed(4) }}
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6">
          <p class="text-center text-h5 font-weight-bold">Progressive Volume (W)</p>
          <line-chart v-if="volumeData" :chart-data="volumeData"></line-chart>
        </v-col>
        <v-col cols="6">
          <p class="text-center text-h5 font-weight-bold">Content (W)</p>
          <line-chart v-if="weekData" :chart-data="weekData"></line-chart>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <p class="text-center text-h5 font-weight-bold">Timelock Content (W)</p>
          <line-chart v-if="tlcWeekData" :chart-data="tlcWeekData"></line-chart>
        </v-col>
        <v-col cols="6">
          <p class="text-center text-h5 font-weight-bold">Token Transfers (W)</p>
          <line-chart v-if="trxCountWeekData" :chart-data="trxCountWeekData"></line-chart>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import _ from "lodash";
import { mapState } from "vuex";
import { requireLoggedIn } from "@/utility";
import { apiRequest } from "@/novusphere-js/discussions/api";

import LineChart from "@/components/LineChart";

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export default requireLoggedIn({
  name: "AnalyticsPage",
  components: {
    LineChart,
  },
  props: {},
  computed: {
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    volumeSymbol: "ATMOS",
    volumeData: null,
    weekData: null,
    tlcWeekData: null,
    trxCountWeekData: null,
    ytd: null,
  }),
  watch: {
    async volumeSymbol() {
      await this.setVolumeChart();
    },
  },
  async created() {
    const { analytics, weekly } = await this.setBaseAnalytics();

    const ytd = analytics.reduce(
      (pv, cv) => this.mergeStrategy(pv, cv),
      undefined
    );

    this.ytd = ytd;

    // ----

    await this.setVolumeChart();

    // ----

    const weekData = {
      labels: weekly.map((a) => new Date(a.time).toLocaleDateString()),
      datasets: [
        {
          label: "Threads",
          backgroundColor: "#07279E",
          data: weekly.map((a) => a.threads),
        },
        {
          label: "Posts",
          backgroundColor: "#f87979",
          data: weekly.map((a) => a.posts),
        },
      ],
    };

    this.weekData = weekData;

    // ---

    const tlcWeekData = {
      labels: weekly.map((a) => new Date(a.time).toLocaleDateString()),
      datasets: [
        {
          label: "ATMOS",
          backgroundColor: "#003e3f",
          data: weekly.map((a) => a.trxs.tlc.ATMOS),
        },
      ],
    };

    const trxCountWeekData = {
      labels: weekly.map((a) => new Date(a.time).toLocaleDateString()),
      datasets: [
        {
          label: "Transfers",
          backgroundColor: "#003e3f",
          data: weekly.map((a) => a.trxs.count),
        },
      ],
    };

    this.trxCountWeekData = trxCountWeekData;
    this.tlcWeekData = tlcWeekData;

    // ---
  },
  methods: {
    async setBaseAnalytics() {
      const analytics = await this.getAnalytics();

      const weeks = _.groupBy(
        analytics.map((a) => ({
          ...a,
          w: Math.floor(a.time / ONE_WEEK),
        })),
        ({ w }) => w
      );

      const weekly = [];
      for (const week of Object.values(weeks)) {
        const weeklyAnalytics = week.reduce(
          (pv, cv) => this.mergeStrategy(pv, cv),
          undefined
        );

        weekly.push(weeklyAnalytics);
      }

      this._analytics = analytics;
      this._weekly = weekly;

      return { analytics, weekly };
    },
    async getAnalytics() {
      return await apiRequest(
        "/v1/api/data/analytics",
        {},
        { key: this.keys.arbitrary.key }
      );
    },
    async setVolumeChart() {
      const weekly = this._weekly;
      const tokenSymbols = [this.volumeSymbol];

      const volumeData = {
        labels: weekly.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: tokenSymbols.map((ts) => ({
          label: ts,
          backgroundColor: "#808080",
          data: weekly.map(
            (a) =>
              (a.trxs.volume[ts] || 0) +
              weekly
                .filter((b) => b.time < a.time)
                .reduce((pv, cv) => pv + (cv.trxs.volume[ts] || 0), 0)
          ),
        })),
      };
      this.volumeData = volumeData;
    },
    mergeStrategy(a, b) {
      if (!a) return b;
      if (!b) return a;
      const merged = {
        eosAccounts: a.eosAccounts + b.eosAccounts,
        posts: a.posts + b.posts,
        threads: a.threads + b.threads,
        time: Math.min(a.time, b.time),
        trxs: {
          count: a.trxs.count + b.trxs.count,
          tlc: { ...a.trxs.tlc },
          swap: { ...a.trxs.swap },
          volume: { ...a.trxs.volume },
        },
      };

      for (const symbol in b.trxs.tlc) {
        merged.trxs.tlc[symbol] =
          (merged.trxs.tlc[symbol] || 0) + b.trxs.tlc[symbol];
      }

      for (const symbol in b.trxs.swap) {
        merged.trxs.swap[symbol] =
          (merged.trxs.swap[symbol] || 0) + b.trxs.swap[symbol];
      }

      for (const symbol in b.trxs.volume) {
        merged.trxs.volume[symbol] =
          (merged.trxs.volume[symbol] || 0) + b.trxs.volume[symbol];
      }

      return merged;
    },
  },
});
</script>