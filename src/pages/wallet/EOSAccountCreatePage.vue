<template>
  <v-card>
    <v-card-text>
      <v-form ref="form" v-model="valid" @submit.prevent>
        <UserAssetSelect
          :exclude="['EOSDT']"
          :label="'Pay with Asset'"
          :item-text="`symbol`"
          v-model="symbol"
          required
        ></UserAssetSelect>

        <v-text-field v-model="total" label="Amount" required disabled></v-text-field>

        <v-text-field
          v-model="account"
          :rules="accountNameRules"
          hint="Your new account name"
          label="EOS Account"
          required
        ></v-text-field>

        <v-text-field
          v-model="publicKey"
          hint="The public key to use for your EOS account"
          label="Public Key"
        ></v-text-field>

        <v-text-field
          type="password"
          v-model="password"
          :rules="passwordTesterRules"
          label="Password"
        ></v-text-field>

        <TransactionSubmitText
          :link="transactionLink"
          :error="transactionError"
        >Your Account has been successfully created on the network.</TransactionSubmitText>

        <v-btn
          :block="$vuetify.breakpoint.mobile"
          color="primary"
          @click="submit()"
          :disabled="!valid || disableSubmit"
        >
          <v-progress-circular class="mr-2" indeterminate v-show="disableSubmit"></v-progress-circular>
          <span>Create</span>
        </v-btn>

        <v-btn
          @click="showPrivateKey()"
          v-show="publicKey == this.keys.wallet.pub"
          color="primary"
          :block="$vuetify.breakpoint.mobile"
          :class="{ 'ml-2': !$vuetify.breakpoint.mobile, 'mt-2': $vuetify.breakpoint.mobile }"
        >Show Private Key</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
import { passwordTesterRules } from "@/utility";
import { mapState, mapGetters } from "vuex";
import { sleep } from "@/novusphere-js/utility";
import {
  sumAsset,
  getToken,
  getTransactionLink,
  getFeeForAmount,
  createAsset,
  decrypt,
  transfer,
  withdrawAction,
  brainKeyToKeys,
  newdexQuote,
  newdexSwap,
} from "@/novusphere-js/uid";

import UserAssetSelect from "@/components/UserAssetSelect";
import TransactionSubmitText from "@/components/TransactionSubmitText";

export default {
  name: "EOSAccountCreatePage",
  components: {
    UserAssetSelect,
    TransactionSubmitText,
  },
  props: {},
  computed: {
    ...passwordTesterRules("password", "encryptedTest"),
    accountNameRules() {
      const rules = [];
      if (this.account.length != 12) {
        rules.push("Account must be exactly 12 characters long");
      } else {
        const validNameRegex = /[a-z0-5]+/g;
        const match = this.account.match(validNameRegex);
        if (!match || match[0] != this.account) {
          rules.push(
            `Account must only use lowercase letters (a-z) or numbers 1-5`
          );
        }
      }
      return rules;
    },
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
    total: 0,
    amount: 0,
    fee: 0,
    account: "",
    publicKey: "",
    transactionLink: "",
    transactionError: "",
  }),
  watch: {
    async symbol() {
      await this.refreshQuote();
    },
  },
  async created() {
    this.symbol = "EOS"; // will trigger watch.symbol
    this.publicKey = this.keys.wallet.pub;
  },
  methods: {
    async refreshQuote() {
      if (this.symbol == "EOS") {
        this.amount = "0.5000 EOS";
        this.fee = await getFeeForAmount(this.amount);
        this.total = await sumAsset(this.amount, this.fee);
      } else {
        this.disableSubmit = true;

        try {
          const hops = await newdexQuote(this.symbol, "1.000 EOS", true);
          const firstHop = hops[0];
          this.amount = firstHop.quantity;
          this.fee = await createAsset(0, this.symbol);
          this.total = this.amount;
        } catch (ex) {
          this.transactionError = ex.message;
        }

        this.disableSubmit = false;
      }
    },
    async showPrivateKey() {
      if (this.publicKey != this.keys.wallet.pub)
        this.transactionError = "Can only reveal private key for wallet key";
      else if (this.passwordTesterRules.length)
        this.transactionError = "You must enter the correct password first";
      else {
        const brainKey = decrypt(this.encryptedBrainKey, this.password);
        const keys = await brainKeyToKeys(brainKey);
        const walletPrivateKey = keys.wallet.key;

        this.transactionError = walletPrivateKey;
      }
    },
    async submit() {
      this.transactionLink = "";
      this.transactionError = "";

      if (this.passwordTesterRules.length) return;
      if (this.accountNameRules.length) return;
      if (!this.total || this.total.split(" ")[1] != this.symbol) return;

      const brainKey = decrypt(this.encryptedBrainKey, this.password);
      const keys = await brainKeyToKeys(brainKey);
      const walletPrivateKey = keys.wallet.key;

      const token = await getToken(this.symbol);

      let receipt = undefined;

      const accountCreationMemo = `${this.account}-${this.publicKey}`;

      try {
        if (this.symbol == "EOS") {
          const request = withdrawAction({
            chain: token.p2k.chain,
            senderPrivateKey: walletPrivateKey,
            account: `signupeoseos`,
            amount: await createAsset(this.amount, token.symbol),
            fee: await createAsset(this.fee, token.symbol),
            nonce: Date.now(),
            memo: accountCreationMemo,
          });

          this.disableSubmit = true;
          await sleep(200);

          receipt = await transfer([request]);
        } else {
          const fromAsset = await createAsset(this.amount, token.symbol);
          const withdraw = withdrawAction({
            chain: token.p2k.chain,
            senderPrivateKey: walletPrivateKey,
            account: `eosforumanon`,
            amount: fromAsset,
            fee: await createAsset(0, token.symbol),
            nonce: Date.now(),
            memo: `Token swap ${this.fromAsset} to ${this.toAsset} for account creation`,
          });

          this.disableSubmit = true;
          await sleep(200);

          receipt = await newdexSwap(
            withdraw,
            "1.0000 EOS",
            accountCreationMemo
          );
        }

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
      } catch (ex) {
        this.transactionError = ex.message;
        console.log(ex);
      }

      this.disableSubmit = false;
      this.password = "";
      this.$refs.form.resetValidation();

      await this.refreshQuote();
    },
  },
};
</script>