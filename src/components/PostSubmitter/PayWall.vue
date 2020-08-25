<template>
  <v-expansion-panels class="mt-2" flat tile :value="false">
    <v-expansion-panel>
      <v-expansion-panel-header style="padding-left: 0px !important">Paywall Options</v-expansion-panel-header>
      <v-expansion-panel-content>
        <v-switch v-model="paywallEnabled" label="Enabled"></v-switch>
        <v-form ref="paywallForm" :disabled="!paywallEnabled">
          <v-row>
            <v-col :cols="6">
              <v-text-field
                prepend-icon="attach_money"
                label="Quantity"
                v-model="paywallAssetAmount"
              ></v-text-field>
            </v-col>
            <v-col :cols="6">
              <UserAssetSelect
                no-amount
                :item-text="`symbol`"
                allow-zero
                v-model="paywallAssetSymbol"
                required
              ></UserAssetSelect>
            </v-col>
          </v-row>
          <v-row>
            <v-col :cols="6">
              <v-select
                prepend-icon="timer"
                :items="['1 hour', ...Array.from(new Array(23)).map((_, i) => `${i+2} hours`)]"
                v-model="simpleExpiry"
                label="Expiration"
              ></v-select>
            </v-col>
          </v-row>
          <v-row v-if="false">
            <v-col :cols="6">
              <v-menu
                v-model="menu1"
                ref="menu"
                :close-on-content-click="false"
                :return-value.sync="paywallExpireDate"
                transition="scale-transition"
                offset-y
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="paywallExpireDate"
                    label="Expiration Date"
                    prepend-icon="event"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-date-picker v-model="paywallExpireDate" no-title scrollable>
                  <v-spacer></v-spacer>
                  <v-btn text color="primary" @click="menu = false">Cancel</v-btn>
                  <v-btn text color="primary" @click="$refs.menu.save(paywallExpireDate)">OK</v-btn>
                </v-date-picker>
              </v-menu>
            </v-col>
            <v-col :cols="6">
              <v-menu
                v-model="menu2"
                ref="menu2"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="paywallExpireTime"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
              >
                <template v-slot:activator="{ on, attrs }">
                  <v-text-field
                    v-model="paywallExpireTime"
                    label="Expiration Time"
                    prepend-icon="access_time"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  ></v-text-field>
                </template>
                <v-time-picker
                  v-model="paywallExpireTime"
                  full-width
                  @click:minute="$refs.menu2.save(paywallExpireTime)"
                ></v-time-picker>
              </v-menu>
            </v-col>
          </v-row>
          <v-row v-if="false">
            <v-col :cols="12">
              <v-btn :disabled="!paywallEnabled" color="primary" @click="clearPaywall()">Clear</v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import UserAssetSelect from "@/components/UserAssetSelect";
import { isValidAsset } from "@/novusphere-js/uid";

export default {
  name: "PayWall",
  components: {
    UserAssetSelect,
  },
  props: {},
  watch: {},
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      keys: (state) => state.keys,
    }),
    value() {
      if (!this.paywallEnabled) return undefined;

      const asset = `${this.paywallAssetAmount} ${this.paywallAssetSymbol}`;
      if (!isValidAsset(asset))
        return { $error: `Invalid asset or quantity selected` };

      if (!this.simpleExpiry)
          return { $error: `You must select an expiration time` };

      const expire = new Date(Date.now() + (parseInt(this.simpleExpiry) * 60 * 60 * 1000));

      /*if (!this.paywallExpireDate)
          return { $error: `You must select an expiry date or click clear` };
        if (!this.paywallExpireTime)
          return { $error: `You must select an expiry time or click clear` };

        expire = new Date(
          `${this.paywallExpireDate} ${this.paywallExpireTime}`
        );
      */

      if (!expire || isNaN(expire.getTime()))
        return {
          $error: `Invalid expiry date time selected, try clicking clear`,
        };

      if (expire.getTime() <= Date.now())
        return {
          $error: `This paywall will already have expired by posting it, if this is intentional, consider simply turning paywall off.`,
        };

      //if (expire) return { $error: `stop` };

      return {
        asset,
        expire,
      };
    },
  },
  data: () => ({
    paywallEnabled: false,
    paywallAssetAmount: null,
    paywallAssetSymbol: null,
    paywallExpireDate: null,
    paywallExpireTime: null,
    simpleExpiry: null,
    menu1: false,
    menu2: false,
  }),
  async created() {},
  methods: {
    clearPaywall() {
      //this.paywallAssetAmount = null;
      //this.paywallAssetSymbol = null;
      this.simpleExpiry = null;
      this.paywallExpireDate = null;
      this.paywallExpireTime = null;
      this.$refs.paywallForm.resetValidation();
    },
  },
};
</script>