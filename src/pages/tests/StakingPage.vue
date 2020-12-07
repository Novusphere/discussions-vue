<template>
  <div>
    <v-row justify="center">
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <h1>Staking 2.0</h1>
            <v-row>
              <v-col cols="4">
                <UserAssetSelect
                  ref="assets"
                  disabled
                  allow-zero
                  :include="['ATMOS']"
                  v-model="symbol"
                />
              </v-col>
              <v-col cols="4">
                <v-form ref="form" lazy-validation @submit.prevent>
                  <v-text-field
                    type="password"
                    v-model="password"
                    :rules="passwordTesterRules"
                    label="Password"
                    @keydown.enter="toggleLock()"
                  >
                    <template v-slot:append-outer>
                      <v-btn
                        icon
                        @click="toggleLock()"
                        small
                        dense
                        color="primary"
                      >
                        <v-icon>{{
                          walletPrivateKey ? "lock" : "lock_open"
                        }}</v-icon>
                      </v-btn>
                    </template>
                  </v-text-field>
                </v-form>
              </v-col>
              <v-col cols="4"
                ><v-btn class="mt-2" color="primary" @click="claim" primary>
                  Claim
                </v-btn>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="4">
                <v-text-field label="Amount" v-model="stakeAmount">
                  <template v-slot:append>
                    <TokenIcon :symbol="'ATMOS'" />
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="4">
                <v-select
                  prepend-icon="timer"
                  :items="stakeTimeItems"
                  v-model="stakeSecs"
                  label="Time"
                ></v-select>
              </v-col>
              <v-col cols="4"
                ><v-btn class="mt-2" color="primary" @click="stake" primary>
                  Stake
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
        <v-data-table
          hide-default-footer
          :headers="stakeTableHeaders"
          :items="stakes"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td class="text-xs-center">
                {{ ((item.weight / stats.total_weight) * 100).toFixed(4) }}%
              </td>
              <td class="text-xs-center">{{ item.balance }}</td>
              <td class="text-xs-center">
                {{ item.expires.toLocaleString() }}
              </td>
              <td class="text-xs-center">
                <v-btn color="error" @click="exit(item)">Exit</v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { passwordTesterRules } from "@/utility";
import { sleep } from "@/novusphere-js/utility";
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

import UserAssetSelect from "@/components/UserAssetSelect";
import TokenIcon from "@/components/TokenIcon";

export default {
  name: "StakingPage",
  components: {
    UserAssetSelect,
    TokenIcon,
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
  },
  data: () => ({
    symbol: "ATMOS",
    stakeTableHeaders: [
      { text: `Weight`, value: `weight` },
      { text: `Balance`, value: `balance` },
      { text: `Expires`, value: `expires` },
      { text: `Actions` },
    ],
    stakeTimeItems: [
      { text: "Invalid (test)", value: 10 },
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
      { text: "1 year", value: 12 * 31 * 24 * 60 * 60 - 10 },
    ],
    atmos: "",
    stakeAmount: 0,
    stakeSecs: 80,
    stakeError: "",
    stakeMessage: "",
    password: "",
    stats: null,
    stakes: [],
    walletPrivateKey: "",
  }),
  async created() {
    await this.refresh();
    this.$refs.form.validate();
  },
  async beforeDestroy() {
    this.walletPrivateKey = "";
  },
  methods: {
    async toggleLock() {
      if (this.walletPrivateKey) {
        this.walletPrivateKey = "";
      } else {
        if (this.passwordTesterRules.length) return;

        const brainKey = decrypt(this.encryptedBrainKey, this.password);
        const keys = await brainKeyToKeys(brainKey);
        const walletPrivateKey = keys.wallet.key;

        this.walletPrivateKey = walletPrivateKey;
        this.password = "";
        this.$refs.form.resetValidation();
      }
    },
    async refresh() {
      this.atmos = await getAsset(this.symbol, this.keys.wallet.pub);
      const { stats, stakes } = await getStakes(this.keys.wallet.pub);
      if (stats) {
        this.stats = { ...stats, last_claim: new Date(`${stats.last_claim}Z`) };
        this.stakes = (stakes || []).map((s) => ({
          ...s,
          expires: new Date(`${s.expires}Z`),
        }));
      }

      if (this.$refs.assets) this.$refs.assets.refresh();
    },
    async claim() {
      try {
        this.stakeError = "";
        this.stakeMessage = "Trying to claim staking rewards... please wait...";

        claimStake;
        const receipt = await claimStake(this.keys.wallet.pub);
        if (receipt.transaction_id) {
          this.stakeMessage = `Success! Since you were the one who claimed it, you will also receive a bonus!`;
        } else {
          if (receipt.error && receipt.message) {
            this.stakeError = receipt.message;
          }
          console.log(receipt);
        }
      } catch (ex) {
        const message = ex.message;
        if (
          message.indexOf("it has not been a sufficient amount of time") > -1
        ) {
          const when = new Date(this.stats.last_claim.getTime() + 24 * 60 * 60);
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
        if (receipt.transaction_id) {
          this.stakeMessage = `Successfully unstaked!`;
          await sleep(2000);
          await this.refresh();
        } else {
          if (receipt.error && receipt.message) {
            this.stakeError = receipt.message;
          }
          console.log(receipt);
        }
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

      try {
        const stakeAmount = parseFloat(this.stakeAmount);
        const stakeSecs = parseFloat(this.stakeSecs);

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

        if (receipt.transaction_id) {
          this.stakeMessage = `Successfully staked ${request.amount}`;
          await sleep(2000);
          await this.refresh();
        } else {
          if (receipt.error && receipt.message) {
            this.stakeError = receipt.message;
          }
          console.log(receipt);
        }
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