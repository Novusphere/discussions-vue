<template>
  <div>
    <v-card v-if="transfers.length == 0">
      <v-card-title>
        <span class="headline">Transfer</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid">
          <UserAssetSelect ref="assets" v-model="symbol" required></UserAssetSelect>

          <v-text-field v-model="amount" label="Amount" required></v-text-field>
        </v-form>
        <TransactionSubmitText
          :link="transactionLink"
        >Your tip has been successfully submitted to the network.</TransactionSubmitText>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="close()" v-show="closable">Close</v-btn>
        <v-btn color="primary" @click="showSummary()" :disabled="!valid || disableSubmit">
          <v-progress-circular class="mr-2" indeterminate v-show="disableSubmit"></v-progress-circular>
          <span>Next</span>
        </v-btn>
      </v-card-actions>
    </v-card>
    <ApproveTransfersCard
      :disable-submit="disableSubmit"
      :closable="closable"
      :pending-transfers="transfers"
      :close-text="'Back'"
      @close="transfers = []"
      @submit="submitTransfer"
      v-else
    >
      <TransactionSubmitText :error="transactionError" />
    </ApproveTransfersCard>
  </div>
</template>

<script>
import { mapState } from "vuex";
import {
  getChainForSymbol,
  createAsset,
  getAmountFeeAssetsForTotal,
  sumAsset,
  decrypt,
  brainKeyToKeys,
  getTransactionLink,
  transfer,
} from "@/novusphere-js/uid";

import UserAssetSelect from "@/components/UserAssetSelect";
import ApproveTransfersCard from "@/components/ApproveTransfersCard";
import TransactionSubmitText from "@/components/TransactionSubmitText";

export default {
  name: "SendTipCard",
  components: {
    UserAssetSelect,
    ApproveTransfersCard,
    TransactionSubmitText,
  },
  props: {
    closable: Boolean,
    recipient: Object, // { pub, uidw, displayName, uuid?, callback? }
  },
  data: () => ({
    disableSubmit: false,
    valid: false,
    symbol: "",
    amount: 0,
    transfers: [],
    transactionLink: "",
    transactionError: "",
  }),
  computed: {
    ...mapState({
      keys: (state) => state.keys,
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      encryptedTest: (state) => state.encryptedTest,
      tempPassword: (state) => state.tempPassword,
    }),
  },
  methods: {
    async close() {
      this.$emit("close");
    },
    async refresh() {
      this.transactionError = "";
      this.transactionLink = "";
      this.transfers = [];
      if (this.$refs.assets) {
        await this.$refs.assets.refresh();
      }
    },
    async showSummary() {
      if (!this.symbol) return;

      const { amountAsset, feeAsset } = await getAmountFeeAssetsForTotal(
        await createAsset(this.amount, this.symbol)
      );

      let transferActions = [];
      transferActions.push({
        chain: await getChainForSymbol(this.symbol),
        senderPrivateKey: "",
        recipientPublicKey: this.recipient.uidw,
        amount: amountAsset,
        fee: feeAsset,
        nonce: Date.now(),
        memo: this.recipient.memo || `tip`,
        // non-standard transfer action data (used in transfer dialog)
        recipient: {
          pub: this.recipient.pub, // their posting (arbitrary) key
          displayName: this.recipient.displayName,
        },
        symbol: this.symbol,
        total: await sumAsset(amountAsset, feeAsset),
      });

      this.transfers = transferActions;
    },
    async submitTransfer(tempPassword) {
      this.transactionLink = "";
      this.transactionError = "";

      // update transfer actions with the wallet key
      let transferActions = [...this.transfers];
      if (decrypt(this.encryptedTest, tempPassword) != "test")
        return console.log(`Invalid password`);

      const keys = await brainKeyToKeys(
        decrypt(this.encryptedBrainKey, tempPassword)
      );

      transferActions = transferActions.map((ta) => ({
        ...ta,
        senderPrivateKey: keys.wallet.key,
      }));

      let notify = undefined;
      if (this.recipient.uuid) {
        // there's a post uuid associated with this tip
        notify = { name: "tip", data: { parentUuid: this.recipient.uuid } };
      }

      try {
        this.disableSubmit = true;

        const receipt = await transfer(transferActions, notify);
        this.disableSubmit = false;

        if (receipt.transaction_id) {
          await this.refresh();
          const transactionLink = await getTransactionLink(
            this.symbol,
            receipt.transaction_id
          );
          //console.log(transactionLink);
          this.transactionLink = transactionLink;

          if (this.recipient.callback) {
            this.recipient.callback({
              transaction: receipt.transaction_id,
              transferActions: transferActions.map((ta) => ({
                ...ta,
                senderPrivateKey: "",
              })),
            });
          }
        } else {
          if (receipt.error && receipt.message) {
            this.transactionError = receipt.message;
          }
          console.log(receipt);
        }
      } catch (ex) {
        console.log(ex);
        this.disableSubmit = false;
        this.transactionError = ex.toString();
      }
    },
  },
};
</script>