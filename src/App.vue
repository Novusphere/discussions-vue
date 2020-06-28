<template>
  <v-app>
    <AppBar />
    <v-main :style="{background: $vuetify.theme.themes[theme].background}">
      <v-dialog
        v-model="isLoginDialogOpen"
        @click:outside="$store.commit('setLoginDialogOpen', false)"
      >
        <LoginCard />
      </v-dialog>

      <v-dialog
        max-width="600"
        v-model="isTransferDialogOpen"
        @click:outside="$store.commit('setTransferDialogOpen', { value: false })"
      >
        <ApproveTransfersCard
          closable
          :pending-transfers="pendingTransfers"
          @close="closeTransfer"
          @submit="submitTransfer"
        />
      </v-dialog>

      <v-dialog
        max-width="600"
        v-model="isSendTipDialogOpen"
        @click:outside="$store.commit('setSendTipDialogOpen', { value: false })"
      >
        <SendTipCard ref="sendTip" closable @close="closeTip" :recipient="sendTipRecipient" />
      </v-dialog>

      <v-container v-if="$vuetify.breakpoint.mobile">
        <v-row no-gutters>
          <v-col cols="12">
            <router-view></router-view>
          </v-col>
        </v-row>
      </v-container>
      <v-container v-else>
        <v-row>
          <v-col cols="2">
            <v-card>
              <AppNav>
                <v-list-item>
                  <v-btn
                    block
                    color="primary"
                    @click="isLoggedIn ? console.log('logged in') : $store.commit('setLoginDialogOpen', true)"
                  >New Post</v-btn>
                </v-list-item>
              </AppNav>
            </v-card>
          </v-col>
          <v-col cols="10">
            <router-view></router-view>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import { mapState, mapGetters } from "vuex";

import AppBar from "@/components/AppBar";
import AppNav from "@/components/AppNav";
import LoginCard from "@/components/LoginCard";
import ApproveTransfersCard from "@/components/ApproveTransfersCard";
import SendTipCard from "@/components/SendTipCard";

export default {
  name: "App",
  components: {
    AppBar,
    AppNav,
    LoginCard,
    ApproveTransfersCard,
    SendTipCard
  },
  watch: {
    async isSendTipDialogOpen() {
      const sendTip = this.$refs.sendTip;
      if (sendTip && this.isSendTipDialogOpen) {
        await sendTip.refresh();
      }
    }
  },
  computed: {
    theme() {
      return this.$vuetify.theme.dark ? "dark" : "light";
    },
    ...mapGetters(['isLoggedIn']),
    ...mapState({
      isLoginDialogOpen: state => state.isLoginDialogOpen,
      isTransferDialogOpen: state => state.isTransferDialogOpen,
      isSendTipDialogOpen: state => state.isSendTipDialogOpen,
      pendingTransfers: state => state.pendingTransfers,
      sendTipRecipient: state => state.sendTipRecipient
    })
  },
  data: () => ({
    //
  }),
  created() {},
  methods: {
    async closeTip() {
      this.$store.commit("setSendTipDialogOpen", { value: false });
    },
    async closeTransfer() {
      this.$store.commit("setTransferDialogOpen", { value: false });
    },
    async submitTransfer(password) {
      this.$store.commit("setTempPassword", password);
      this.$store.commit("setTransferDialogOpen", { value: false });
    }
  }
};
</script>

<style>
html,
body {
  overflow-y: scroll;
  overflow-x: hidden;
}
body {
  position: relative;
}
</style>
