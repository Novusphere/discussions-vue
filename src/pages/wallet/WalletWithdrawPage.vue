<template>
  <v-card>
    <v-card-text>
      <v-form ref="form" v-model="valid" @submit.prevent>
        <UserAssetSelect v-model="symbol" required></UserAssetSelect>

        <v-text-field v-model="amount" label="Amount" required @change="amountChange()"></v-text-field>

        <v-text-field readonly v-model="fee" label="Fee" required></v-text-field>

        <v-text-field v-model="total" label="Total" required @change="totalChange()"></v-text-field>

        <v-text-field v-model="account" label="EOS Account" required></v-text-field>

        <v-text-field v-model="memo" label="Memo"></v-text-field>

        <v-text-field
          type="password"
          v-model="password"
          :rules="passwordTesterRules"
          label="Password"
          @keydown.enter="submitWithdraw()"
        ></v-text-field>

        <TransactionSubmitText
          :link="transactionLink"
          :error="transactionError"
        >Your withdrawal has been successfully submitted to the network.</TransactionSubmitText>

        <v-btn
          :block="$vuetify.breakpoint.mobile"
          color="primary"
          @click="submitWithdraw()"
          :disabled="!valid || disableSubmit"
        >
          <v-progress-circular class="mr-2" indeterminate v-show="disableSubmit"></v-progress-circular>
          <span>Withdraw</span>
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
import { passwordTesterRules } from "@/utility";
import { mapState, mapGetters } from "vuex";

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
  brainKeyToKeys,
} from "@/novusphere-js/uid";

import UserAssetSelect from "@/components/UserAssetSelect";
import TransactionSubmitText from "@/components/TransactionSubmitText";

export default {
  name: "WalletAssetsPage",
  components: {
    UserAssetSelect,
    TransactionSubmitText,
  },
  props: {},
  computed: {
    ...passwordTesterRules("password", "encryptedTest"),
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      encryptedTest: (state) => state.encryptedTest,
      keys: (state) => state.keys,
    }),
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
    transactionError: "",
  }),
  watch: {
    async symbol() {
      await this.totalChange();
    },
  },
  async created() {},
  methods: {
    async totalChange() {
      if (!this.symbol) return;
      const {
        amountAsset,
        feeAsset,
        totalAsset,
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

      if (this.passwordTesterRules.length) return;

      const password = this.password;
      this.password = "";
      this.$refs.form.resetValidation();

      const brainKey = decrypt(this.encryptedBrainKey, password);
      const keys = await brainKeyToKeys(brainKey);
      const walletPrivateKey = keys.wallet.key;

      try {
        this.disableSubmit = true;

        let forward = undefined;

        // this account(s) need a top level transfer action... sigh
        if (this.account == "probitwallet") {
          forward = this.account;
        }

        const token = await getToken(this.symbol);
        const request = withdrawAction({
          chain: token.p2k.chain,
          senderPrivateKey: walletPrivateKey,
          account: forward ? `eosforumanon` : this.account,
          amount: await createAsset(this.amount, token.symbol),
          fee: await createAsset(this.fee, token.symbol),
          nonce: Date.now(),
          memo: this.memo,
        });

        const receipt = await transfer(
          [request],
          undefined,
          undefined,
          forward
        );

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
      } catch (ex) {
        this.transactionError = ex.message;
        this.disableSubmit = false;
      }
    },
  },
};
</script>