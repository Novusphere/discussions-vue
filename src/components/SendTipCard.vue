<template>
  <div>
    <v-card v-if="transfers.length == 0">
      <v-card-title>
        <span class="headline">Transfer</span>
      </v-card-title>
      <v-card-text>
        <v-form ref="form" v-model="valid" @submit.prevent>
          <UserAssetSelect
            ref="assets"
            v-model="symbol"
            required
          ></UserAssetSelect>

          <v-text-field v-model="amount" label="Amount" required></v-text-field>
        </v-form>
        <TransactionSubmitText :link="transactionLink"
          >Your tip has been successfully submitted to the
          network.</TransactionSubmitText
        >
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn color="primary" @click="close()" v-show="closable">Close</v-btn>
        <v-btn
          color="primary"
          @click="showSummary()"
          :disabled="!valid || disableSubmit"
        >
          <v-progress-circular
            class="mr-2"
            indeterminate
            v-show="disableSubmit"
          ></v-progress-circular>
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
      <v-progress-linear
        v-show="disableSubmit"
        v-model="progress"
        color="primary"
        class="mb-2 mt-2"
      ></v-progress-linear>
      <TransactionSubmitText :error="transactionError" />
    </ApproveTransfersCard>
  </div>
</template>

<script>
import { mapState } from "vuex";
import {
  getToken,
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
    recipient: Array, // [{ pub, uidw, displayName, uuid?, callback? }]
  },
  data: () => ({
    progress: 0,
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
  watch: {
    async recipient() {
      if (!this.recipient) return;
      if (this.recipient.length == 0) return;

      const $asset = this.recipient[0].$asset;

      if (!$asset) return;

      if (this.recipient.every((r) => r.$asset == $asset)) {
        const [amount, symbol] = $asset.split(" ");
        this.amount = parseFloat(amount);
        this.symbol = symbol;
        await this.showSummary();
      }
    },
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

      const symbolToken = await getToken(this.symbol);

      for (const recipient of this.recipient) {
        transferActions.push({
          chain: symbolToken.p2k.chain,
          senderPrivateKey: "",
          recipientPublicKey: recipient.uidw,
          amount: amountAsset,
          fee: feeAsset,
          nonce: Date.now(),
          memo: recipient.memo || `tip`,
          // non-standard transfer action data (used in transfer dialog)
          recipient: {
            pub: recipient.pub, // their posting (arbitrary) key
            displayName: recipient.displayName,
          },
          symbol: this.symbol,
          total: await sumAsset(amountAsset, feeAsset),
        });
      }

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
        metadata: undefined,
      }));

      let notify = this.recipient.map((r) => ({
        name: "tip",
        data: { parentUuid: r.uuid },
      }));

      for (let i = 0; i < notify.length; i++) {
        transferActions[i].metadata = JSON.stringify(notify[i]);
      }

      try {
        this.disableSubmit = true;
        this.progress = 0;

        const symbolToken = await getToken(this.symbol);

        const receipt = await transfer(
          transferActions,
          async (current, max) => {
            this.progress = (max > 0 ? current / max : 1) * 100;
          },
          undefined,
          symbolToken.chain
        );

        this.disableSubmit = false;

        if (receipt.transaction_id) {
          await this.refresh();
          const transactionLink = await getTransactionLink(
            this.symbol,
            receipt.transaction_id
          );
          //console.log(transactionLink);
          this.transactionLink = transactionLink;

          const strippedTransferActions = transferActions.map((ta) => ({
            ...ta,
            senderPrivateKey: "",
          }));

          for (const recipient of this.recipient) {
            if (recipient.callback) {
              recipient.callback({
                transaction: receipt.transaction_id,
                transferActions: strippedTransferActions,
              });
            }
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