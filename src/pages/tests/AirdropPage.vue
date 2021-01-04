<template>
  <div>
    <v-card>
      <v-card-text>
        <h1>Airdrop Tool</h1>
        <v-row>
          <v-col :cols="12">
            <v-textarea
              :error-messages="airdropDataErrors"
              :error-count="airdropDataErrors.length"
              v-model="airdropData"
              label="Airdrop Data"
              required
            ></v-textarea>
          </v-col>
          <v-col :cols="12">
            <ConnectWalletBtn
              class="text-center"
              no-eth
              ref="connector"
              :block="$vuetify.breakpoint.mobile"
              color="primary"
              @error="(ex) => (transactionError = ex.toString())"
            >
              <template v-slot:action>
                <v-btn class="ml-2" color="primary" @click="airdrop"
                  >Airdrop</v-btn
                >
              </template>
              <template v-slot:disconnect="{ logout }">
                <v-btn
                  :block="$vuetify.breakpoint.mobile"
                  :class="{
                    'ml-2': !$vuetify.breakpoint.mobile,
                    'mt-2': $vuetify.breakpoint.mobile,
                  }"
                  color="primary"
                  @click="logout"
                  >Disconnect Wallet
                </v-btn>
              </template>
            </ConnectWalletBtn>
          </v-col>
          <v-col :cols="12">
            <TransactionSubmitText
              :link="transactionLink"
              :error="transactionError"
              >Your airdrop has been successfully submitted to the
              network.</TransactionSubmitText
            >
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import ConnectWalletBtn from "@/components/ConnectWalletBtn";
import TransactionSubmitText from "@/components/TransactionSubmitText";
import {
  eos,
  createAsset,
  getChainForSymbol,
  getToken,
  getTransactionLink,
} from "@/novusphere-js/uid";
import ecc from "eosjs-ecc";

eos;
createAsset;
getChainForSymbol;

export default {
  name: "AirdropPage",
  components: {
    ConnectWalletBtn,
    TransactionSubmitText
  },
  props: {},
  data: () => ({
    validating: false,
    airdropData: "",
    airdropDataErrors: [],
    transactionLink: "",
    transactionError: "",
  }),
  mounted() {
    this.example();
  },
  methods: {
    example() {
      this.airdropData = `nsfoundation,5.12 ATMOS,this is an airdrop hello\r\nEOS8AgDT1hFD699511kaoPAXSpvqMJrngAnqG2JsxEdWUEDLcAC4s,10 ATMOS`;
    },
    async airdrop() {
      this.airdropDataErrors = [];
      this.validating = true;
      this.transactionLink = "";
      this.transactionError = "";

      const nsuidcntract = `nsuidcntract`;

      const lines = this.airdropData.split("\n").map((s) => s.trim());
      const data = lines.map((s) => {
        let [id, asset, memo] = s.split(",");
        let [amount, symbol] = asset.split(" ");
        return { id, amount, symbol, memo };
      });

      for (let i = 0; i < data.length; i++) {
        let { id, amount, symbol, memo } = data[i];
        if (!id || !amount || !symbol) {
          this.airdropDataErrors.push(
            `Error at line ${i + 1}: formatting is wrong`
          );
          continue;
        }

        if (id.length > 12) {
          if (!ecc.isValidPublic(id)) {
            this.airdropDataErrors.push(
              `Error at line ${i + 1}: invalid public key ${id}`
            );
            continue;
          } else {
            memo = id;
            id = nsuidcntract;
          }
        } else if (!(await eos.getAccount(id))) {
          this.airdropDataErrors.push(
            `Error at line ${i + 1}: account does not exist ${id}`
          );
          continue;
        }

        const asset = await createAsset(amount, symbol);
        lines[i] = `${id},${asset},${memo || ""}`;
      }

      this.airdropData = lines.join("\r\n");
      this.validating = false;

      try {
        let token = undefined;
        const wallet = this.$refs.connector.wallet;
        const actions = await Promise.all(
          lines.map(async (s) => {
            const [account, asset, memo] = s.split(",");
            const [, symbol] = asset.split(" ");
            token = await getToken(symbol);

            return {
              account: token.contract,
              name: "transfer",
              authorization: [
                {
                  actor: wallet.auth.accountName,
                  permission: wallet.auth.permission,
                },
              ],
              data: {
                from: wallet.auth.accountName,
                memo: memo || "",
                quantity: asset,
                to: account,
              },
            };
          })
        );

        if (!token) throw new Error(`Token is undefined`);

        const receipt = await wallet.eosApi.transact(
          { actions },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60,
          }
        );

        this.transactionLink = await getTransactionLink(
          token.symbol,
          receipt.transaction_id
        );
      } catch (ex) {
        this.transactionError = `Unexpected error: ${ex.message}`;
      }
    },
  },
};
</script>