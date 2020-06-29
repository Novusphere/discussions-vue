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
                  <v-btn block color="primary" @click="createPost()">New Post</v-btn>
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
    ...mapGetters(["isLoggedIn, hasLoginSession"]),
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
  created() {
    // TO-DO: deprecate this code on 8/1/2020
    function importOld() {
      let authStore = window.localStorage["authStore"];
      if (authStore) {
        authStore = JSON.parse(authStore);

        let bk = JSON.parse(authStore.bk);
        let encryptedBrainKey = bk.bk;
        let encryptedTest = bk.bkc;
        let displayName = authStore.displayName || bk.displayName;

        let keys = {
          arbitrary: { key: authStore.postPriv, pub: bk.post },
          wallet: { pub: bk.uidwallet },
          identity: { key: authStore.accountPrivKey, pub: bk.account }
        };

        // convert to new format
        return {
          encryptedBrainKey,
          encryptedTest,
          displayName,
          keys
        };
      }
      return undefined;
    }

    try {
      if (!this.hasLoginSession) {
        const old = importOld();
        if (old) {
          console.log(`Retrieved legacy session!`);
          console.log(old);
          this.$store.commit("importOld", old);
        }
      }
    } catch (ex) {
      return console.error(ex);
    }
  },
  methods: {
    async createPost() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      try {
        if (this.$route.params.tags) {
          // only take a single tag
          const tag = this.$route.params.tags.split(",")[0];
          await this.$router.push(`/tag/${tag}/submit`);
        } else {
          await this.$router.push(`/submit`);
        }
      } catch (ex) {
        return; // Avoided redundant navigation
      }
    },
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
