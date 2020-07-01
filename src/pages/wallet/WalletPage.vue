<template>
  <BrowsePageLayout no-right>
    <template v-slot:header>
      <v-card flat>
        <v-card-text>
          <v-row no-gutters>
            <v-col :cols="12">
              <PublicKeyIcon :size="80" class="d-inline" :publicKey="keys.wallet.pub" />
              <div class="d-inline-block ml-2">
                <div :class="{ 'wallet-pub-mobile': $vuetify.breakpoint.mobile }">
                  <span class="text-h5 primary--text">{{ keys.wallet.pub }}</span>
                </div>
              </div>
              <v-btn class="d-inline-block mb-4" icon @click="$copyText(keys.wallet.pub)">
                <v-icon>content_copy</v-icon>
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-btn text :to="`/wallet/assets`">Assets</v-btn>
      <v-btn text :to="`/wallet/deposit`" disabled>Deposit</v-btn>
      <v-btn text :to="`/wallet/withdraw`">Withdraw</v-btn>
    </template>
    <template v-slot:content>
      <router-view></router-view>
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapState } from "vuex";
import { requireLoggedIn } from "@/utility";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default requireLoggedIn({
  name: "WalletPage",
  components: {
    BrowsePageLayout,
    PublicKeyIcon
  },
  props: {},
  computed: {
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({})
});
</script>

<style scoped>
.wallet-pub-mobile {
  max-width: 175px;
  text-overflow: ellipsis;
  /* Required for text-overflow to do anything */
  white-space: nowrap;
  overflow: hidden;
}
</style>