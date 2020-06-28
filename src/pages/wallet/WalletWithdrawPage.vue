<template>
  <v-card>
    <v-card-text>
      <v-form ref="form" v-model="valid">
        <UserAssetSelect v-model="symbol" required></UserAssetSelect>

        <v-text-field v-model="amount" label="Amount" required></v-text-field>

        <v-text-field v-model="fee" label="Fee" required></v-text-field>

        <v-text-field v-model="account" label="EOS Account" required></v-text-field>

        <v-text-field v-model="memo" label="Memo"></v-text-field>

        <div class="success--text text-center" v-show="transactionLink">
          Your withdrawal has been successfully submitted to the network.
          <a
            :href="transactionLink"
            target="_blank"
          >View Transaction</a>
        </div>
        <div class="error--text text-center" v-show="transactionError">{{ transactionError }}</div>

        <v-btn color="primary" @click="submitWithdraw()" :disabled="!valid">Submit</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
import UserAssetSelect from "@/components/UserAssetSelect";

import {
  getTokensInfo,
  getTransactionLink,
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
    ...mapState({
      encryptedBrainKey: state => state.encryptedBrainKey,
      keys: state => state.keys
    })
  },
  data: () => ({
    valid: false,
    assets: [],
    symbol: "",
    amount: 1,
    fee: 1,
    account: "asphyxiating",
    memo: "test",
    transactionLink: "",
    transactionError: ""
  }),
  async created() {
  },
  methods: {
    async submitWithdraw() {
      this.transactionLink = "";
      this.transactionError = "";

      const brainKey = decrypt(this.encryptedBrainKey, "hello");
      const keys = await brainKeyToKeys(brainKey);
      const walletPrivateKey = keys.wallet.key;

      const tokens = await getTokensInfo();
      const token = tokens.find(t => t.symbol == this.symbol);

      const request = withdrawAction({
        chain: token.p2k.chain,
        senderPrivateKey: walletPrivateKey,
        account: this.account,
        amount: await createAsset(this.amount, token.symbol),
        fee: await createAsset(this.fee, token.symbol),
        nonce: Date.now(),
        memo: this.memo
      });

      if (request) {
        console.log(this.symbol);
        console.log(request);
        return;
      }

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
    }
  }
};
</script>