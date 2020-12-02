<template>
  <div>
    <v-card>
      <v-card-text>
        <h1>Staking 2.0 [WARNING: FOR TESTING]</h1>
        <v-row>
          <v-col cols="4"> ATMOS: {{ atmos }} </v-col>
          <v-col cols="4">
            <v-text-field
              type="password"
              v-model="password"
              :rules="passwordTesterRules"
              label="Password"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-btn color="primary" outlined @click="refresh" class="mr-1"
              >Refresh
            </v-btn>
            <v-btn color="primary" @click="claim" class="mr-1"
              >Claim
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="4"
            ><v-text-field label="Amount" v-model="stakeAmount"></v-text-field>
          </v-col>
          <v-col cols="4"
            ><v-text-field label="Days" v-model="stakeDays"></v-text-field>
          </v-col>
          <v-col cols="4"
            ><v-btn color="primary" @click="startStake" primary> Stake</v-btn>
          </v-col>
          <v-col v-if="stakeError" cols="12"
            ><span class="error--text">{{ stakeError }}</span>
          </v-col>
        </v-row>
        <v-data-table :headers="stakeTableHeaders" :items="stakes">
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
import {
  getToken,
  getAsset,
  createAsset,
  getFeeForAmount,
  decrypt,
  transfer,
  withdrawAction,
  brainKeyToKeys,
  getStakes,
  exitStake,
  claimStake,
} from "@/novusphere-js/uid";

export default {
  name: "StakingPage",
  components: {},
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
    stakeTableHeaders: [
      { text: `Weight`, value: `weight` },
      { text: `Balance`, value: `balance` },
      { text: `Expires`, value: `expires` },
      { text: `Actions` },
    ],
    atmos: "",
    stakeAmount: 0,
    stakeDays: 3,
    stakeError: "",
    password: "",
    stats: null,
    stakes: [],
  }),
  async created() {
    await this.refresh();
  },
  methods: {
    async refresh() {
      this.atmos = await getAsset("ATMOS", this.keys.wallet.pub);

      const { stats, stakes } = await getStakes(this.keys.wallet.pub);
      if (stats) {
        //console.log(stats);
        //console.log(stakes);

        this.stats = stats;
        this.stakes = (stakes || []).map((s) => ({
          ...s,
          expires: new Date(`${s.expires}Z`),
        }));
      }
    },
    async claim() {
      try {
        this.stakeError = "doing stuff... give it a sec";
        const receipt = await claimStake();
        if (receipt.transaction_id) {
          this.stakeError = `success trxid ${receipt.transaction_id}`;
        } else {
          if (receipt.error && receipt.message) {
            this.stakeError = receipt.message;
          }
          console.log(receipt);
        }
      } catch (ex) {
        this.stakeError = ex.message;
        console.log(ex);
      }
    },
    async exit(stake) {
      stake;
      this.stakeError = "";

      if (this.passwordTesterRules.length) {
        this.stakeError = "invalid password";
        return;
      }

      const brainKey = decrypt(this.encryptedBrainKey, this.password);
      const keys = await brainKeyToKeys(brainKey);
      const walletPrivateKey = keys.wallet.key;

      this.stakeError = "doing stuff... give it a sec";

      try {
        const receipt = await exitStake(stake.key, walletPrivateKey);
        if (receipt.transaction_id) {
          this.stakeError = `success trxid ${receipt.transaction_id}`;
        } else {
          if (receipt.error && receipt.message) {
            this.stakeError = receipt.message;
          }
          console.log(receipt);
        }
      } catch (ex) {
        this.stakeError = ex.message;
        console.log(ex);
      }
    },
    async startStake() {
      this.stakeError = "";

      if (this.passwordTesterRules.length) {
        this.stakeError = "invalid password";
        return;
      }

      this.stakeError = "doing stuff... give it a sec";

      const brainKey = decrypt(this.encryptedBrainKey, this.password);
      const keys = await brainKeyToKeys(brainKey);
      const walletPrivateKey = keys.wallet.key;

      try {
        const stakeAmount = parseFloat(this.stakeAmount);
        if (isNaN(stakeAmount)) throw new Error(`Invalid stake amount`);
        if (stakeAmount < 100) throw new Error(`Minimum stake is 100 ATMOS`); // due to the fee
        if (stakeAmount > parseFloat(this.atmos))
          throw new Error(`You don't have that much ATMOS or need to refresh`);

        const stakeDays = parseFloat(this.stakeDays);
        if (isNaN(stakeDays)) throw new Error(`Invalid stake days`);
        //if (stakeDays < 3) throw new Error(`Minimum stake days is 3`);

        const token = await getToken("ATMOS");
        const amountAsset = await createAsset(stakeAmount, "ATMOS");
        const request = withdrawAction({
          chain: token.p2k.chain,
          senderPrivateKey: walletPrivateKey,
          account: `atmosstakev2`,
          amount: amountAsset,
          fee: await getFeeForAmount(amountAsset),
          nonce: Date.now(),
          memo: `stake ${keys.wallet.pub} ${Math.floor(
            this.stakeDays * 86400
          )}`,
        });

        const receipt = await transfer(
          [request],
          undefined,
          undefined,
          token.chain
        );

        if (receipt.transaction_id) {
          this.stakeError = `success trxid ${receipt.transaction_id}`;
        } else {
          if (receipt.error && receipt.message) {
            this.stakeError = receipt.message;
          }
          console.log(receipt);
        }
      } catch (ex) {
        this.stakeError = ex.message;
        console.log(ex);
      }
    },
  },
};
</script>