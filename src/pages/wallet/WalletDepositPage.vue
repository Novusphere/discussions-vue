<template>
  <v-card>
    <v-card-text>
      <v-row>
        <v-col :cols="12">
          <v-form ref="form" v-model="valid">
            <UserAssetSelect :item-text="`symbol`" allow-zero v-model="symbol" required></UserAssetSelect>

            <v-text-field v-model="amount" label="Amount" required @change="amountChange()"></v-text-field>

            <div class="success--text text-center" v-show="transactionLink">
              Your deposit has been successfully submitted to the network.
              <a
                :href="transactionLink"
                target="_blank"
              >View Transaction</a>
            </div>
            <div class="error--text text-center" v-show="transactionError">{{ transactionError }}</div>

            <v-btn color="primary" @click="submitDeposit()" :disabled="!valid || disableSubmit">
              <v-progress-circular class="mr-2" indeterminate v-show="disableSubmit"></v-progress-circular>
              <span>Wallet Deposit</span>
            </v-btn>
            <v-btn class="ml-2" color="primary" :disabled="!valid || disableSubmit" @click="manualDeposit = !manualDeposit">
              <span>Manuaul Deposit</span>
            </v-btn>
          </v-form>
        </v-col>
        <v-col :cols="12" v-show="manualDeposit">
          <v-divider />
          <div class="mt-2">
            <span
              class="d-block"
            >Alternatively, to manually deposit funds from your wallet or an exchange please send them to</span>
            <v-text-field
              append-icon="content_copy"
              v-model="p2kContract"
              label="Account"
              readonly
              @click:append="$copyText(p2kContract)"
            ></v-text-field>
            <v-text-field
              append-icon="content_copy"
              :value="keys.wallet.pub"
              label="Memo"
              readonly
              @click:append="$copyText(keys.wallet.pub)"
            ></v-text-field>
            <span
              class="error--text d-block"
            >Please note: It's important you use this memo EXACTLY! If you are depositing from an exchange and cannot specify a memo then you must first withdraw to an EOS wallet of your own first!</span>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
import UserAssetSelect from "@/components/UserAssetSelect";
import { sleep } from "@/novusphere-js/utility";
import {
  getToken,
  getTransactionLink,
  createAsset,
  eos
} from "@/novusphere-js/uid";

export default {
  name: "WalletAssetsPage",
  components: {
    UserAssetSelect
  },
  props: {},
  computed: {
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({
    manualDeposit: false,
    disableSubmit: false,
    p2kContract: "",
    valid: false,
    symbol: "",
    amount: 0,
    transactionLink: "",
    transactionError: ""
  }),
  watch: {
    async symbol() {
      const token = await getToken(this.symbol);
      this.p2kContract = token.p2k.contract;

      await this.amountChange();
    }
  },
  async created() {},
  methods: {
    async amountChange() {
      if (!this.symbol) return;
      const amountAsset = await createAsset(this.amount, this.symbol);
      this.amount = amountAsset.split(" ")[0];
    },
    async submitDeposit() {
      this.transactionLink = "";
      this.transactionError = "";

      try {
        this.disableSubmit = true;
        await sleep(150);

        const wallet = await eos.connectWallet();
        const token = await getToken(this.symbol);
        const actions = [
          {
            account: token.contract,
            name: "transfer",
            authorization: [
              {
                actor: wallet.auth.accountName,
                permission: wallet.auth.permission
              }
            ],
            data: {
              from: wallet.auth.accountName,
              to: token.p2k.contract,
              quantity: await createAsset(this.amount, this.symbol),
              memo: this.keys.wallet.pub
            }
          }
        ];

        const receipt = await wallet.eosApi.transact(
          { actions },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60
          }
        );

        if (receipt.transaction_id) {
          this.transactionLink = await getTransactionLink(
            token.symbol,
            receipt.transaction_id
          );
        } else {
          // shouldn't happen, but just incase...
          console.log(receipt);
        }

        this.disableSubmit = false;
      } catch (ex) {
        if (ex.message) this.transactionError = ex.message;
        else this.transactionError = ex.toString();
        console.log(ex);
        this.disableSubmit = false;
      }
    }
  }
};
</script>