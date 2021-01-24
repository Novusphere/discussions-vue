<template>
  <div>
    <v-row>
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6">
        <v-card>
          <v-card-text>
            <h1>
              Staking
              <v-btn icon small dense class="pb-1" @click="help"
                ><v-icon>help</v-icon></v-btn
              >
            </h1>
            <v-row>
              <v-col :cols="6">
                <v-text-field
                  label="Total Staked"
                  v-model="totalStaked"
                  readonly
                >
                  <template v-slot:append>
                    <TokenIcon :symbol="'ATMOS'" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col :cols="6">
                <v-text-field
                  label="Staking Rank"
                  v-model="stakingRank"
                  readonly
                >
                  <template v-slot:append>
                    <TokenIcon :symbol="'ATMOS'" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col :cols="12">
                <v-text-field
                  label="Total Earned"
                  v-model="totalEarned"
                  readonly
                >
                  <template v-slot:append>
                    <TokenIcon :symbol="'ATMOS'" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col :cols="6">
                <v-text-field
                  label="Total Stake Weight"
                  v-model="totalStakeWeight"
                  readonly
                ></v-text-field>
              </v-col>
              <v-col :cols="6">
                <v-text-field label="APR" v-model="apr" readonly></v-text-field>
              </v-col>
              <v-col :cols="6">
                <v-text-field
                  label="System Staked"
                  v-model="systemStaked"
                  readonly
                ></v-text-field>
              </v-col>
              <v-col :cols="6">
                <v-text-field
                  label="System Subsidy"
                  v-model="systemSubsidy"
                  readonly
                ></v-text-field>
              </v-col>
              <v-col :cols="12">
                <v-btn block color="primary" @click="refresh" primary>
                  Refresh
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6">
        <v-card>
          <v-card-text>
            <v-row>
              <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6">
                <UserAssetSelect
                  ref="assets"
                  disabled
                  allow-zero
                  :include="['ATMOS']"
                  v-model="symbol"
                />
              </v-col>
              <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6">
                <v-form ref="form" lazy-validation @submit.prevent>
                  <v-text-field
                    type="password"
                    v-model="password"
                    :rules="passwordTesterRules"
                    label="Password"
                    @keydown.enter="toggleLock()"
                  >
                  </v-text-field>
                </v-form>
              </v-col>
            </v-row>
            <v-row>
              <v-col :cols="6">
                <v-text-field
                  :hint="estimateAPR"
                  label="Amount"
                  v-model="stakeAmount"
                >
                  <template v-slot:append>
                    <TokenIcon :symbol="'ATMOS'" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col :cols="6">
                <v-select
                  :items="stakeTimeItems"
                  v-model="stakeSecs"
                  label="Time"
                ></v-select>
              </v-col>
              <v-col :cols="6">
                <v-btn color="primary" @click="toggleLock()" block>
                  <v-icon>{{ walletPrivateKey ? "lock" : "lock_open" }}</v-icon>
                  <span>{{ walletPrivateKey ? "Wallet" : "Wallet" }}</span>
                </v-btn>
              </v-col>
              <v-col :cols="6">
                <v-btn block color="primary" @click="stake" primary>
                  Stake
                </v-btn>
              </v-col>
              <v-col :cols="12">
                <v-btn block color="primary" @click="claim" primary>
                  Try Claim
                </v-btn>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12">
                <span v-if="stakeError" class="error--text">{{
                  stakeError
                }}</span>
                <span v-else-if="stakeMessage" class="success--text">{{
                  stakeMessage
                }}</span>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-2">
      <v-card-text>
        <h1>Active Stakes</h1>
        <v-data-table
          hide-default-footer
          :headers="stakeTableHeaders"
          :items="stakes"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td class="text-xs-center">{{ item.balance }}</td>
              <td class="text-xs-center">
                {{ item.expires.toLocaleString() }}
              </td>
              <td class="text-xs-center">
                <v-btn
                  small
                  dense
                  color="error"
                  @click="exit(item)"
                  :disabled="item.expires.getTime() > dateNow"
                >
                  Exit
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-card class="mt-2" max-height="600">
      <v-card-text>
        <h1>All Stakes</h1>
        <bar-chart
          v-if="stakesBarChartData"
          :chartData="stakesBarChartData"
          :options="barChartOptions"
        />
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { passwordTesterRules } from "@/utility";
import { sleep, checkTransaction } from "@/novusphere-js/utility";
import {
  getToken,
  getAsset,
  createAsset,
  //getFeeForAmount,
  decrypt,
  transfer,
  withdrawAction,
  brainKeyToKeys,
  getStakes,
  exitStake,
  claimStake,
} from "@/novusphere-js/uid";
import eos from "@/novusphere-js/uid/eos";

import UserAssetSelect from "@/components/UserAssetSelect";
import TokenIcon from "@/components/TokenIcon";
import BarChart from "@/components/BarChart";
//import Countdown from "@/components/Countdown";

export default {
  name: "StakingPage",
  components: {
    UserAssetSelect,
    TokenIcon,
    BarChart,
    //Countdown,
  },
  props: {},
  computed: {
    ...passwordTesterRules("password", "encryptedTest"),
    ...mapGetters([]),
    ...mapState({
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      encryptedTest: (state) => state.encryptedTest,
      keys: (state) => state.keys,
    }),
    estimateAPR() {
      const stakeAmount = parseFloat(this.stakeAmount);
      const stakeSecs = parseFloat(this.stakeSecs);

      if (!this.stats || isNaN(stakeAmount) || isNaN(stakeSecs)) return "";

      const stats = this.getMyStakeStats(stakeAmount, stakeSecs);
      console.log(stats);

      return `estimated APR after staking: ${(stats.apr * 100).toFixed(4)}%`;
    },
  },
  data: () => ({
    symbol: "ATMOS",
    stakeTableHeaders: [
      { text: `Balance`, value: `balance`, sortable: false },
      { text: `Expires`, value: `expires`, sortable: false },
      { text: `Actions`, sortable: false },
    ],
    stakeTimeItems: [
      { text: "1 minute", value: 80 },
      { text: "15 minute", value: 15 * 60 },
      { text: "30 minute", value: 30 * 60 },
      { text: "45 minute", value: 45 * 60 },
      { text: "1 hour", value: 60 * 60 },
      { text: "3 hour", value: 3 * 60 * 60 },
      { text: "6 hour", value: 6 * 60 * 60 },
      { text: "12 hour", value: 12 * 60 * 60 },
      { text: "1 day", value: 24 * 60 * 60 },
      { text: "7 days", value: 7 * 24 * 60 * 60 },
      { text: "1 month", value: 31 * 24 * 60 * 60 },
      { text: "3 months", value: 3 * 31 * 24 * 60 * 60 },
      { text: "6 months", value: 6 * 31 * 24 * 60 * 60 },
      { text: "1 year", value: 365 * 24 * 60 * 60 - 10 },
    ],
    dateNow: 0,
    systemStaked: "",
    systemSubsidy: "",
    atmos: "",
    stakeAmount: 0,
    stakeSecs: 80,
    stakeError: "",
    stakeMessage: "",
    password: "",
    stats: null,
    nextClaim: null,
    stakes: [],
    walletPrivateKey: "",
    stakingRank: "",
    totalStaked: "",
    totalEarned: "",
    apr: "",
    totalStakeWeight: "",
    stakesBarChartData: null,
    barChartOptions: {
      responsive: true,
      maintainAspectRatio: false,
    },
  }),
  async created() {
    await this.refresh();
    this.$refs.form.validate();
  },
  async beforeDestroy() {
    this.walletPrivateKey = "";
  },
  methods: {
    help() {
      window.open(
        `https://discussions.app/tag/atmos/95lsknsyxf45/atmos-staking`
      );
    },
    async toggleLock() {
      this.stakeError = "";
      this.stakeMessage = "";

      if (this.walletPrivateKey) {
        this.walletPrivateKey = "";
      } else {
        if (this.passwordTesterRules.length) {
          this.stakeError = this.passwordTesterRules[0];
          return;
        }

        const brainKey = decrypt(this.encryptedBrainKey, this.password);
        const keys = await brainKeyToKeys(brainKey);
        const walletPrivateKey = keys.wallet.key;

        this.walletPrivateKey = walletPrivateKey;
        this.password = "";
        this.stakeMessage = "Wallet has been unlocked!";
        this.$refs.form.resetValidation();
      }
    },
    getMyStakeStats(addAmount = 0, addSecs = 0) {
      // int64_t weight = (balance.amount / 10000) * (eosio::time_diff_secs(expires, now) / 60);
      const addWeight = Math.floor((addAmount / 10) * (addSecs / 60));

      const totalStaked = this.stakes.reduce(
        (pv, cv) => pv + parseFloat(cv.initial_balance),
        0
      );

      const totalEarned =
        this.stakes.reduce((pv, cv) => pv + parseFloat(cv.balance), 0) -
        totalStaked;

      const weightFactor =
        (addWeight + this.stakes.reduce((pv, cv) => pv + parseFloat(cv.weight), 0)) /
        (Math.max(this.stats.total_weight, 1) + addWeight);

      const earnInYear =
        weightFactor *
        parseFloat(this.stats.round_subsidy) *
        ((365 * 24 * 60 * 60) / this.stats.min_claim_secs);

      const apr = earnInYear / (totalStaked + addAmount || 1);

      return { totalStaked, totalEarned, weightFactor, earnInYear, apr };
    },
    async refresh() {
      this.atmos = await getAsset(this.symbol, this.keys.wallet.pub);
      let { stats, stakes, rank } = await getStakes(this.keys.wallet.pub);
      if (stats) {
        this.stats = { ...stats, last_claim: new Date(`${stats.last_claim}Z`) };
        this.stakingRank = `#${rank}`;

        this.systemStaked = this.stats.total_supply;
        this.systemSubsidy = this.stats.subsidy_supply;

        this.nextClaim = new Date(
          this.stats.last_claim.getTime() + 24 * 60 * 60 * 1000
        );

        //console.log(stakes);

        this.dateNow = Date.now();
        this.stakes = (stakes || []).map((s) => ({
          ...s,
          expires: new Date(`${s.expires}Z`),
        }));

        const {
          totalStaked,
          totalEarned,
          weightFactor,
          apr,
        } = this.getMyStakeStats();

        this.totalStaked = `${totalStaked.toFixed(3)} ATMOS`;
        this.totalEarned = `${totalEarned.toFixed(3)} ATMOS`;
        this.apr = `${(apr * 100).toFixed(4)}%`;
        this.totalStakeWeight = `${(weightFactor * 100).toFixed(4)}%`;

        this.refreshStakesBarChart();
      }

      if (this.$refs.assets) this.$refs.assets.refresh();
    },
    async refreshStakesBarChart() {
      this.stakesBarChartData = null;

      const api = await eos.getAPI();
      const rows = [];

      let lower_bound = "0";
      do {
        let table = await api.rpc.get_table_rows({
          json: true,
          code: `atmosstakev2`,
          scope: `3,ATMOS`,
          table: "stakes",
          limit: 100,
          key_type: "",
          lower_bound: lower_bound,
          index_position: 1,
        });

        lower_bound = table.more ? table.next_key : undefined;
        rows.push(...table.rows);
      } while (lower_bound);

      const stakeAmounts = [0, 0, 0, 0, 0];
      const si = this.stakeTimeItems.findIndex((si) => si.text == "7 days");
      const now = Date.now();

      for (let { balance, expires } of rows) {
        expires = new Date(`${expires}Z`).getTime();
        for (let i = si; i < this.stakeTimeItems.length; i++) {
          if (expires <= now + this.stakeTimeItems[i].value * 1000) {
            stakeAmounts[i - si] += parseFloat(balance);
            break;
          }
        }
      }

      if (
        Math.abs(
          stakeAmounts.reduce((pv, cv) => pv + cv, 0) -
            parseFloat(this.systemStaked)
        ) > 1
      ) {
        console.log(`Failed sanity check for [stakeAmounts] vs [systemStaked]`);
      }

      const chartData = {
        labels: [...this.stakeTimeItems]
          .slice(si, this.stakeTimeItems.length)
          .map((s) => `within ${s.text}`),
        datasets: [
          {
            label: "ATMOS",
            backgroundColor: "#079e99",
            data: [...stakeAmounts].map((sa) => Math.floor(sa)),
          },
        ],
      };

      this.stakesBarChartData = chartData;
    },
    async claim() {
      try {
        this.stakeError = "";
        this.stakeMessage = "Trying to claim staking rewards... please wait...";

        claimStake;
        const receipt = await claimStake(this.keys.wallet.pub);
        checkTransaction(receipt);

        this.stakeMessage = `Success! Since you were the one who claimed it, you will also receive a bonus!`;
        await this.refresh();
      } catch (ex) {
        const message = ex.message;
        if (
          message.indexOf("it has not been a sufficient amount of time") > -1
        ) {
          const when = this.nextClaim;
          this.stakeError = `The next claim period is at ${when.toLocaleString()}`;
        } else this.stakeError = message;
        console.log(ex);
      }
    },
    async exit(stake) {
      try {
        if (!this.walletPrivateKey) {
          throw new Error(
            `You must enter your password and press the unlock button before you can exit a stake`
          );
        }

        this.stakeError = "";
        this.stakeMessage = "Trying to exit stake... please wait...";

        const receipt = await exitStake(stake.key, this.walletPrivateKey);
        checkTransaction(receipt);

        this.stakeMessage = `Successfully unstaked!`;
        await sleep(2000);
        await this.refresh();
      } catch (ex) {
        const message = ex.message;
        if (message.indexOf("stake is not yet expired") > -1)
          this.stakeError = "This stake has not yet expired!";
        else this.stakeError = message;
        console.log(ex);
      }
    },
    async stake() {
      this.stakeMessage = "Attempting to create stake... please wait... ";
      this.stakeError = "";

      const walletPrivateKey = this.walletPrivateKey;
      const stakeAmount = parseFloat(this.stakeAmount);
      const stakeSecs = parseFloat(this.stakeSecs);

      try {
        if (!walletPrivateKey)
          throw new Error(
            `You must first enter your password and press the unlock button`
          );
        if (isNaN(stakeAmount)) throw new Error(`Invalid stake amount`);
        if (isNaN(stakeSecs)) throw new Error(`Invalid stake days`);

        const token = await getToken(this.symbol);
        const amountAsset = await createAsset(stakeAmount, this.symbol);
        const request = withdrawAction({
          chain: token.p2k.chain,
          senderPrivateKey: walletPrivateKey,
          account: `atmosstakev2`,
          amount: amountAsset,
          //fee: await getFeeForAmount(amountAsset),
          fee: await createAsset(0, this.symbol),
          nonce: Date.now(),
          memo: `stake ${this.keys.wallet.pub} ${Math.floor(stakeSecs)}`,
        });

        const receipt = await transfer(
          [request],
          undefined,
          undefined,
          token.chain
        );

        checkTransaction(receipt);

        this.stakeMessage = `Successfully staked ${request.amount}`;
        await sleep(2000);
        await this.refresh();
      } catch (ex) {
        const message = ex.message;

        if (message.indexOf("invalid json") > -1)
          this.stakeError =
            "An unexpected block producer error has occured, please try again later.";
        else if (message.indexOf("amount does not meet the minimum") > -1)
          this.stakeError = `You must stake at least ${this.stats.min_stake}`;
        else if (message.indexOf("staking period is too short") > -1)
          this.stakeError = `You must stake for at least ${this.stats.min_stake_secs} seconds`;
        else if (message.indexOf("user has insufficient balance") > -1)
          this.stakeError = `You are trying to stake more ${this.symbol} than you have!`;
        else this.stakeError = message;

        console.log(ex);
      }
    },
  },
};
</script>