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
              <AppNav />
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

import { getUserAccountObject } from "@/novusphere-js/discussions/api";
import { sleep } from "@/novusphere-js/utility";

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
    darkMode() {
      this.$vuetify.theme.dark = this.darkMode;
    },
    async isSendTipDialogOpen() {
      const sendTip = this.$refs.sendTip;
      if (sendTip && this.isSendTipDialogOpen) {
        await sendTip.refresh();
      }
    },
    async needSyncAccount() {
      if (!this.needSyncAccount) return;

      console.log(`Synchronizing account...`);
      await sleep(100);

      let account = await getUserAccountObject(this.keys.identity.key);
      if (!account) {
        console.log(`Did not find account... checking for legacy account...`);
        const oldAccount = await getUserAccountObject(
          this.keys.identity.key,
          `https://discussions.app`
        );

        // TO-REMOVE: migration code
        // note: "https://" is no longer in new acccount domains

        if (oldAccount) {
          console.log(`Found old Discussions account... trying to migrate...`);

          console.log(oldAccount);

          // upgrade to new object format
          const migrated = {
            // NOTE: we didn't bother migrating watched posts
            lastSeenNotificationsTime: oldAccount.data.lastCheckedNotifications,
            subscribedTags: oldAccount.data.tags,
            delegatedMods: oldAccount.data.moderation.delegated.map(m => {
              const [displayName, pub] = m[0].split(":");
              return { displayName, pub, tag: m[1] };
            })
          };

          console.log(migrated);
          account = migrated;
        } else {
          console.log(`Did not find legacy account`);
        }
      } else {
        console.log(`Retrieved account successfully`);
      }

      if (account) this.$store.commit("syncAccount", account);
    }
  },
  computed: {
    theme() {
      return this.darkMode ? "dark" : "light";
    },
    ...mapGetters(["isLoggedIn, hasLoginSession"]),
    ...mapState({
      darkMode: state => state.darkMode,
      needSyncAccount: state => state.needSyncAccount,
      isLoginDialogOpen: state => state.isLoginDialogOpen,
      isTransferDialogOpen: state => state.isTransferDialogOpen,
      isSendTipDialogOpen: state => state.isSendTipDialogOpen,
      pendingTransfers: state => state.pendingTransfers,
      sendTipRecipient: state => state.sendTipRecipient,
      keys: state => state.keys
    })
  },
  data: () => ({
    //
  }),
  created() {
    this.$store.commit("init");
  },
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
