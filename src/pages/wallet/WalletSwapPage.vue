<template>
  <div>
    <v-dialog
      eager
      max-width="600"
      v-model="isSwapDialogOpen"
      @click:outside="isSwapDialogOpen = false"
    >
      <v-card>
        <v-card-title>Token Swap</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="auto">
              <TokenIcon :symbol="fromSymbol" />
              {{ fromAsset }}
            </v-col>
            <v-col cols="auto">
              <v-icon>arrow_right_alt</v-icon>
            </v-col>
            <v-col cols="auto">
              <TokenIcon :symbol="toSymbol" />
              {{ toAsset }}
            </v-col>
          </v-row>

          <v-row>
            <v-col :cols="12">
              <TransactionSubmitText
                :link="transactionLink"
                :error="transactionError"
              >Your swap has been successfully submitted to the network.</TransactionSubmitText>
            </v-col>
          </v-row>

          <v-row v-show="!waiting">
            <v-col cols="12">
              <v-form ref="form" lazy-validation @submit.prevent>
                <v-text-field
                  v-model="password"
                  :rules="passwordTesterRules"
                  label="Password"
                  type="password"
                  required
                  @keydown.enter="submitSwap()"
                ></v-text-field>
              </v-form>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="isSwapDialogOpen = false">Close</v-btn>
          <v-btn color="primary" @click="submitSwap()" :disabled="waiting">
            <v-progress-circular class="mr-2" indeterminate v-if="waiting"></v-progress-circular>Submit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-card>
      <v-card-text>
        <v-row>
          <v-col :cols="12">
            <v-row>
              <v-col :cols="4">
                <v-text-field v-model="fromAmount" label="Amount to swap"></v-text-field>
              </v-col>
              <v-col :cols="4">
                <UserAssetSelect
                  no-amount
                  :item-text="`symbol`"
                  allow-zero
                  v-model="fromSymbol"
                  required
                ></UserAssetSelect>
              </v-col>
            </v-row>
            <v-row>
              <v-col :cols="4">
                <v-text-field v-model="toAmount" label="Quote (readonly)" readonly></v-text-field>
              </v-col>
              <v-col :cols="4">
                <UserAssetSelect
                  no-amount
                  :item-text="`symbol`"
                  allow-zero
                  v-model="toSymbol"
                  required
                ></UserAssetSelect>
              </v-col>
            </v-row>
            <v-row v-if="quoteError">
              <v-col :cols="8">
                <p class="text-center error--text">{{ quoteError }}</p>
              </v-col>
            </v-row>
            <v-row>
              <v-col :cols="4">
                <v-btn :disabled="waiting" block color="primary" @click="getQuote">
                  <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>Get Quote
                </v-btn>
              </v-col>
              <v-col :cols="4">
                <v-btn :disabled="waiting" block color="primary" @click="swap">
                  <v-progress-circular class="mr-2" indeterminate v-show="waiting"></v-progress-circular>Swap
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { passwordTesterRules } from "@/utility";
import UserAssetSelect from "@/components/UserAssetSelect";
import TransactionSubmitText from "@/components/TransactionSubmitText";
import TokenIcon from "@/components/TokenIcon";
import {
  getToken,
  createAsset,
  newdexQuote,
  newdexSwap,
  getTransactionLink,
  decrypt,
  withdrawAction,
  brainKeyToKeys,
} from "@/novusphere-js/uid";

export default {
  name: "WalletSwapPage",
  components: {
    UserAssetSelect,
    TransactionSubmitText,
    TokenIcon,
  },
  props: {},
  watch: {
    toSymbol() {
      this.toAmount = "";
    },
    fromSymbol() {
      this.toAmount = "";
    },
    fromAmount() {
      this.toAmount = "";
    },
  },
  computed: {
    ...passwordTesterRules("password", "encryptedTest"),
    ...mapState({
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      encryptedTest: (state) => state.encryptedTest,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    transactionLink: "",
    transactionError: "",
    quoteError: "",
    password: "",
    fromAmount: "",
    fromSymbol: "EOS",
    fromAsset: "",
    toAmount: "",
    toSymbol: "ATMOS",
    toAsset: "",
    waiting: false,
    isSwapDialogOpen: false,
  }),
  methods: {
    async submitSwap() {
      const tempPassword = this.password;
      this.password = "";
      if (decrypt(this.encryptedTest, tempPassword) != "test")
        return console.log(`Invalid password`);

      this.$refs.form.resetValidation();

      this.transactionLink = "";
      this.transactionError = "";
      this.waiting = true;

      try {
        const brainKey = decrypt(this.encryptedBrainKey, tempPassword);
        const keys = await brainKeyToKeys(brainKey);
        const walletPrivateKey = keys.wallet.key;

        const token = await getToken(this.fromSymbol);

        const withdraw = withdrawAction({
          chain: token.p2k.chain,
          senderPrivateKey: walletPrivateKey,
          account: `eosforumanon`,
          amount: await createAsset(this.fromAmount, token.symbol),
          fee: await createAsset(0, token.symbol),
          nonce: Date.now(),
          memo: `Token swap ${this.fromAsset} to ${this.toAsset}`,
        });

        const receipt = await newdexSwap(withdraw, this.toAsset);
        const transactionLink = await getTransactionLink(
          this.fromSymbol,
          receipt.transaction_id
        );
        this.transactionLink = transactionLink;
        this.waiting = false;
      } catch (ex) {
        this.waiting = false;
        this.transactionError = ex.message;
        console.log(ex);
      }
    },
    async swap() {
      if (!this.toAmount) {
        await this.getQuote();
      }

      if (!this.toAmount) return;

      const fromAsset = await createAsset(this.fromAmount, this.fromSymbol);
      const toAsset = await createAsset(this.toAmount, this.toSymbol);

      this.fromAsset = fromAsset;
      this.toAsset = toAsset;

      this.isSwapDialogOpen = true;
    },
    async getQuote() {
      this.toAmount = "";
      this.quoteError = "";
      
      if (!this.fromAmount || isNaN(this.fromAmount)) return;
      if (!this.fromSymbol) return;
      if (!this.toSymbol) return;
      if (this.fromSymbol == this.toSymbol) return;

      this.waiting = true;

      try {
        const from = await createAsset(this.fromAmount, this.fromSymbol);
        console.log(from);

        const hops = await newdexQuote(from, this.toSymbol);
        console.log(hops);

        const lastHop = hops[hops.length - 1];
        const [toAmount] = lastHop.expect.split(" ");

        this.toAmount = toAmount;
      } catch (ex) {
        this.quoteError = ex.message;
        console.log(ex);
      }

      this.waiting = false;
    },
  },
};
</script>