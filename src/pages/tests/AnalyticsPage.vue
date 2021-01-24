<template>
  <v-card>
    <v-card-text v-if="ytd">
      <v-select v-model="timePeriod" :items="['Daily', 'Weekly', 'Monthly']" label="Time Period"></v-select>

      <v-tabs v-model="tab">
        <v-tab>Main</v-tab>
        <v-tab>Posts</v-tab>
        <v-tab>Volume</v-tab>
        <v-tab>Swaps</v-tab>
        <v-tab>Communities</v-tab>
      </v-tabs>

      <v-tabs-items v-model="tab">
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <v-row>
                <v-col cols="12">
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
                      <strong>Tips:</strong>
                      {{ ytd.trxs.count.tips }}
                    </v-col>
                    <v-col align="center" justify="center">
                      <strong>TLC Tip:</strong>
                      {{ ytd.trxs.count.tlc }}
                    </v-col>
                    <v-col align="center" justify="center">
                      <strong>Swaps:</strong>
                      {{ ytd.trxs.count.swap }}
                    </v-col>
                  </v-row>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="4">
                  <p class="text-center text-h5 font-weight-bold">Activity</p>
                  <line-chart
                    v-if="activityChartData"
                    :chart-data="activityChartData"
                    :options="lineChartOptions"
                  ></line-chart>
                </v-col>
                <v-col cols="4">
                  <p class="text-center text-h5 font-weight-bold">EOS Accounts</p>
                  <line-chart
                    v-if="eosAccountChartData"
                    :chart-data="eosAccountChartData"
                    :options="lineChartOptions"
                  ></line-chart>
                </v-col>
                <v-col cols="4">
                  <p class="text-center text-h5 font-weight-bold">Accounts Activity</p>
                  <line-chart
                    v-if="accountsChartData"
                    :chart-data="accountsChartData"
                    :options="lineChartOptions"
                  ></line-chart>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="4">
                  <p class="text-center text-h5 font-weight-bold">Token Transfers</p>
                  <line-chart
                    v-if="transferChartData"
                    :chart-data="transferChartData"
                    :options="lineChartOptions"
                  ></line-chart>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <p class="text-center text-h5 font-weight-bold">Posts (W)</p>
                  <line-chart
                    v-if="postChartData"
                    :chart-data="postChartData"
                    :options="lineChartOptions"
                  ></line-chart>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-card flat>
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <v-row>
                    <v-col v-for="sym in Object.keys(ytd.trxs.volume)" :key="sym">
                      <v-btn
                        color="primary"
                        :outlined="volumeSymbol != sym"
                        @click="volumeSymbol = sym"
                      >
                        <strong>{{ sym }}:</strong>
                        {{ ytd.trxs.volume[sym].toFixed(4) }}
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="12">
                  <p class="text-center text-h5 font-weight-bold">Progressive Volume (W)</p>
                  <line-chart
                    v-if="volumeData"
                    :chart-data="volumeData"
                    :options="lineChartOptions"
                  ></line-chart>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-tab-item>
        <v-tab-item>
          <v-row>
            <v-col cols="12">
              <p class="text-center text-h5 font-weight-bold">Swaps</p>
              <line-chart
                v-if="swapsChartData"
                :chart-data="swapsChartData"
                :options="lineChartOptions"
              ></line-chart>
            </v-col>
          </v-row>
        </v-tab-item>
        <v-tab-item>
          <v-row>
            <v-col cols="12">
              <p class="text-center text-h5 font-weight-bold">Communities</p>
              <line-chart
                v-if="communitiesChartData"
                :chart-data="communitiesChartData"
                :options="lineChartOptions"
              ></line-chart>
            </v-col>
          </v-row>
        </v-tab-item>
      </v-tabs-items>
    </v-card-text>
  </v-card>
</template>

<script>
import _ from "lodash";
import ecc from "eosjs-ecc";
import { mapState } from "vuex";
import { requireLoggedIn } from "@/utility";
import { apiRequest, getCommunities } from "@/novusphere-js/discussions/api";

import LineChart from "@/components/LineChart";
const ONE_HOUR = 60 * 60 * 1000;
const ONE_WEEK = 7 * 24 * ONE_HOUR;

const TIP_GENESIS = new Date("7/20/2020").getTime();
const TLC_GENESIS = new Date("8/22/2020").getTime();
const SWAP_GENESIS = new Date("8/26/2020").getTime();
//const STAKE_P_GENESIS = new Date("7/27/2020").getTime();

function randomColor(name) {
  const hash = ecc.sha256(name);
  const r = parseInt(hash.substring(0, 2), 16);
  const g = parseInt(hash.substring(2, 4), 16);
  const b = parseInt(hash.substring(4, 6), 16); //Math.floor(Math.random() * 256);
  return { r, g, b };
}

function color(name) {
  name = name.toLowerCase();

  const colorMap = {
    posts: { r: 255, g: 0, b: 0 },
    threads: { r: 0, g: 0, b: 255 },

    tips: { r: 255, g: 0, b: 0 },
    tlc: { r: 0, g: 255, b: 0 },
    swaps: { r: 0, g: 0, b: 255 },

    volume: { r: 0, g: 0, b: 0 },
    atmos: { r: 52, g: 235, b: 189 },
  };

  const { r, g, b } = colorMap[name] || randomColor(name);

  return {
    borderColor: `rgba(${r}, ${g}, ${b}, 1)`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.2)`,
  };
}

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
    tab: 0,
    timePeriod: "Weekly",
    volumeSymbol: "ATMOS",
    volumeData: null,
    activityChartData: null,
    postChartData: null,
    eosAccountChartData: null,
    tlcChartData: null,
    transferChartData: null,
    swapsChartData: null,
    accountsChartData: null,
    communitiesChartData: null,
    ytd: null,
    lineChartOptions: {
      responsive: true,
      tooltips: {
        position: "nearest",
        mode: "index",
        intersect: false,
      },
      hover: {
        mode: "nearest",
        intersect: true,
      },
    },
  }),
  watch: {
    async volumeSymbol() {
      await this.setVolumeChart();
    },
    async timePeriod() {
      await this.init();
    },
  },
  async created() {
    await this.init();
  },
  methods: {
    async init() {
      await this.setBaseAnalytics();
      await this.setBaseYearToDate();
      await this.setVolumeChart();
      await this.setActivityAnalysis();
      await this.setPostAnalysis();
      await this.setTLCAnalysis();
      await this.setTransferAnalysis();
      await this.setSnapshotAnalytics();
    },
    async setSnapshotAnalytics() {
      const analytics = await this.getAnalytics("snapshot");
      const periods = this.toPeriodsData(analytics);
      const communities = (await getCommunities()).filter(
        (comm) => comm.members >= 5
      ); // communities we care about

      const communitiesChartData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: communities.map(({ tag }) => ({
          ...color(tag),
          label: tag,
          data: periods.map((a) =>
            this.progressive(a, periods, (b) => b.communities[tag] || 0)
          ),
        })),
      };

      this.communitiesChartData = communitiesChartData;
    },
    async setTransferAnalysis() {
      const periods = this._periodsData.filter((a) => a.time > TIP_GENESIS);

      const transferChartData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          {
            ...color("Tips"),
            label: "Tips",
            data: periods.map((a) => a.trxs.count.tips),
          },
          {
            ...color("TLC"),
            label: "TLC",
            data: periods.map((a) => a.trxs.count.tlc),
          },
          {
            ...color("Swaps"),
            label: "Swaps",
            data: periods.map((a) => a.trxs.count.swap),
          },
        ],
      };

      const _accountsG = this._periodsData.findIndex(pd => pd.activeAccounts);
      const accountsData = this._periodsData.filter((a, i) => i >= _accountsG);
      const accountsChartData = {
        labels: accountsData.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          {
            ...color("Accounts"),
            label: "Weekly Active Accounts",
            data: accountsData.map((a) => a.activeAccounts),
          },
        ],
      };

      const swapsData = this._periodsData.filter((a) => a.time > SWAP_GENESIS);
      const swapsChartData = {
        labels: swapsData.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          ...Object.keys(this.ytd.trxs.swapPairs).map((sp) => ({
            ...color(sp),
            label: sp,
            data: swapsData.map((a) => a.trxs.swapPairs[sp] || 0),
          })),
        ],
      };

      this.transferChartData = transferChartData;
      this.accountsChartData = accountsChartData;
      this.swapsChartData = swapsChartData;
    },
    async setTLCAnalysis() {
      const periods = this._periodsData.filter((a) => a.time > TLC_GENESIS);
      const tlcChartData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          {
            ...color("ATMOS"),
            label: "ATMOS",
            data: periods.map((a) => a.trxs.tlc.ATMOS),
          },
        ],
      };

      this.tlcChartData = tlcChartData;
    },
    async setActivityAnalysis() {
      const periods = this._periodsData;
      const activityChartData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          {
            ...color("Threads"),
            label: "Threads",
            data: periods.map((a) => a.threads),
          },
          {
            ...color("Posts"),
            label: "Posts",
            data: periods.map((a) => a.posts),
          },
        ],
      };

      const eosAccountChartData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          {
            ...color("eos"),
            label: "EOS Accounts",
            data: periods.map(
              (a) =>
                a.eosAccounts +
                periods
                  .filter((b) => b.time < a.time)
                  .reduce((pv, cv) => pv + cv.eosAccounts, 0)
            ),
          },
        ],
      };

      this.activityChartData = activityChartData;
      this.eosAccountChartData = eosAccountChartData;
    },
    async setPostAnalysis() {
      const periods = this._periodsData;
      const tags = this.tags;
      //const tags = ["atmos", "eos", "boid", "puml", "lbry"];

      const postChartData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          ...tags.map((tag) => ({
            ...color(tag),
            label: `#${tag}`,
            data: periods.map((a) => a.content[tag] || 0),
          })),
        ],
      };

      this.postChartData = postChartData;
    },
    async setBaseYearToDate() {
      const analytics = this._analytics;

      const ytd = analytics.reduce(
        (pv, cv) => this.mergeStrategy(pv, cv),
        undefined
      );

      this.ytd = ytd;
      //this.tags = (await getCommunities()).map(c => c.tag);
      this.tags = Object.keys(ytd.content).filter(
        (key) => ytd.content[key] > 100
      );

      getCommunities;
    },
    toPeriodsData(analytics) {
      let TIME_FRAME = 24 * ONE_HOUR;
      if (this.timePeriod == "Weekly") TIME_FRAME = ONE_WEEK;
      else if (this.timePeriod == "Monthly") TIME_FRAME = 30 * 24 * ONE_HOUR;

      const periods = _.groupBy(
        analytics.map((a) => ({
          ...a,
          w: Math.floor(a.time / TIME_FRAME),
        })),
        ({ w }) => w
      );

      const periodsData = [];
      for (const p of Object.values(periods)) {
        const periodAnalytics = p.reduce(
          (pv, cv) => this.mergeStrategy(pv, cv),
          undefined
        );

        periodsData.push(periodAnalytics);
      }

      return periodsData;
    },
    async setBaseAnalytics() {
      const analytics =
        this._analytics || (await this.getAnalytics("analysis"));
      this._analytics = analytics;
      this._periodsData = this.toPeriodsData(analytics);
    },
    async getAnalytics(type) {
      return await apiRequest(
        "/v1/api/data/analytics",
        { type },
        { key: this.keys.arbitrary.key }
      );
    },
    progressive(a, periods, fieldFn) {
      return (
        (fieldFn(a) || 0) +
        periods
          .filter((b) => b.time < a.time)
          .reduce((pv, cv) => pv + (fieldFn(cv) || 0), 0)
      );
    },
    async setVolumeChart() {
      const periods = this._periodsData.filter((a) => a.time > TIP_GENESIS);
      const volumeData = {
        labels: periods.map((a) => new Date(a.time).toLocaleDateString()),
        datasets: [
          {
            ...color("tips"),
            label: "Tips",
            data: periods.map((a) =>
              this.progressive(
                a,
                periods,
                (b) => b.trxs["tips"][this.volumeSymbol]
              )
            ),
          },
          {
            ...color("swaps"),
            label: "Swaps",
            data: periods.map((a) =>
              this.progressive(
                a,
                periods,
                (b) => b.trxs["swap"][this.volumeSymbol]
              )
            ),
          },
          {
            ...color("tlc"),
            label: "TLC",
            data: periods.map((a) =>
              this.progressive(
                a,
                periods,
                (b) => b.trxs["tlc"][this.volumeSymbol]
              )
            ),
          },
        ],
      };
      this.volumeData = volumeData;
    },
    mergeStrategy(a, b) {
      if (!a) return b;
      if (!b) return a;

      let merged = undefined;

      function mergeTrx(name) {
        for (const symbol in b.trxs[name]) {
          let n = (merged.trxs[name][symbol] || 0) + b.trxs[name][symbol];
          merged.trxs[name][symbol] = n;
        }
      }

      if (a.type == "snapshot") {
        merged = {
          type: a.type,
          communities: {
            ...a.communities,
          },
          time: Math.min(a.time, b.time),
        };

        for (const tag in b.communities) {
          merged.communities[tag] =
            (merged.communities[tag] || 0) + b.communities[tag];
        }
      } else if (a.type == "analysis") {
        merged = {
          type: a.type,
          stakeRewarded: a.stakeRewarded + b.stakeRewarded,
          eosAccounts: a.eosAccounts + b.eosAccounts,
          posts: a.posts + b.posts,
          threads: a.threads + b.threads,
          time: Math.min(a.time, b.time),
          trxs: {
            count: {
              trxs: a.trxs.count.trxs + b.trxs.count.trxs,
              tlc: a.trxs.count.tlc + b.trxs.count.tlc,
              tips: a.trxs.count.tips + b.trxs.count.tips,
              swap: a.trxs.count.swap + b.trxs.count.swap,
            },
            tips: { ...a.trxs.tips },
            tlc: { ...a.trxs.tlc },
            swap: { ...a.trxs.swap },
            swapPairs: { ...a.trxs.swapPairs },
            volume: { ...a.trxs.volume },
          },
          content: {
            ...a.content,
          },
        };

        for (const tag in b.content) {
          merged.content[tag] = (merged.content[tag] || 0) + b.content[tag];
        }

        mergeTrx("tlc");
        mergeTrx("tips");
        mergeTrx("swap");
        mergeTrx("swapPairs");
        mergeTrx("volume");
      }

      return merged;
    },
  },
});
</script>