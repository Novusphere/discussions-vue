<template>
  <v-card>
    <v-card-text>
      <v-form ref="form" v-model="valid">
        <UserAssetSelect v-model="symbol" required></UserAssetSelect>

        <v-text-field v-model="amount" label="Amount" required @change="amountChange()"></v-text-field>

        <v-text-field readonly v-model="fee" label="Fee" required></v-text-field>

        <v-text-field v-model="total" label="Total" required @change="totalChange()"></v-text-field>

        <v-text-field v-model="account" label="EOS Account" required></v-text-field>

        <v-text-field v-model="memo" label="Memo"></v-text-field>

        <v-text-field type="password" v-model="password" :rules="passwordRules" label="Password"></v-text-field>

        <div class="success--text text-center" v-show="transactionLink">
          Your withdrawal has been successfully submitted to the network.
          <a
            :href="transactionLink"
            target="_blank"
          >View Transaction</a>
        </div>
        <div class="error--text text-center" v-show="transactionError">{{ transactionError }}</div>

        <v-btn color="primary" @click="submitWithdraw()" :disabled="!valid || disableSubmit">
          <v-progress-circular class="mr-2" indeterminate v-show="disableSubmit"></v-progress-circular>
          <span>Withdraw</span>
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import UserAssetSelect from "@/components/UserAssetSelect";
import { sleep } from "@/novusphere-js/utility";
import {
  getToken,
  getTransactionLink,
  getAmountFeeAssetsForTotal,
  getFeeForAmount,
  sumAsset,
  createAsset,
  decrypt,
  transfer,
  withdrawAction,
  brainKeyToKeys
} from "@/novusphere-js/uid";

export default {
  name: "WalletAssetsPage",
  components: {
    UserAssetSelect
  },
  props: {},
  computed: {
    passwordRules() {
      const rules = [];
      if (this.isLoggedIn) {
        if (decrypt(this.encryptedTest, this.password) != "test") {
          rules.push(`Password is incorrect`);
        }
      }
      return rules;
    },
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      encryptedBrainKey: state => state.encryptedBrainKey,
      encryptedTest: state => state.encryptedTest,
      keys: state => state.keys
    })
  },
  data: () => ({
    disableSubmit: false,
    password: "",
    valid: false,
    symbol: "",
    amount: 0,
    fee: 0,
    total: 0,
    account: "",
    memo: "",
    transactionLink: "",
    transactionError: ""
  }),
  watch: {
    async symbol() {
      await this.totalChange();
    }
  },
  async created() {},
  methods: {
    async totalChange() {
      if (!this.symbol) return;
      const {
        amountAsset,
        feeAsset,
        totalAsset
      } = await getAmountFeeAssetsForTotal(
        await createAsset(this.total, this.symbol)
      );

      this.total = totalAsset.split(" ")[0];
      this.amount = amountAsset.split(" ")[0];
      this.fee = feeAsset.split(" ")[0];
    },
    async amountChange() {
      if (!this.symbol) return;
      const amountAsset = await createAsset(this.amount, this.symbol);
      const feeAsset = await getFeeForAmount(amountAsset);
      const totalAsset = await sumAsset(amountAsset, feeAsset);

      this.total = totalAsset.split(" ")[0];
      this.amount = amountAsset.split(" ")[0];
      this.fee = feeAsset.split(" ")[0];
    },
    async submitWithdraw() {
      this.transactionLink = "";
      this.transactionError = "";

      if (decrypt(this.encryptedTest, this.password) != "test") return;

      const brainKey = decrypt(this.encryptedBrainKey, this.password);
      const keys = await brainKeyToKeys(brainKey);
      const walletPrivateKey = keys.wallet.key;

      const token = getToken(this.symbol);

      const request = withdrawAction({
        chain: token.p2k.chain,
        senderPrivateKey: walletPrivateKey,
        account: this.account,
        amount: await createAsset(this.amount, token.symbol),
        fee: await createAsset(this.fee, token.symbol),
        nonce: Date.now(),
        memo: this.memo
      });

      console.log(request);

      this.disableSubmit = true;
      await sleep(200);

      const receipt = await transfer([request]);
      if (receipt.transaction_id) {
        this.transactionLink = await getTransactionLink(
          token.symbol,
          receipt.transaction_id
        );
      } else {
        if (receipt.error && receipt.message) {
          this.transactionError = receipt.message;
        }
        console.log(receipt);
      }

      this.disableSubmit = false;
      this.password = "";
    }
  }
};
</script>