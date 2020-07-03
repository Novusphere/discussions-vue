<template>
  <v-app>
    <AppBar />
    <v-main :style="{background: $vuetify.theme.themes[theme].background}">
      <v-dialog
        v-model="isLoginDialogOpen"
        @click:outside="$store.commit('setLoginDialogOpen', false)"
      >
        <v-card>
          <v-tabs v-model="loginTab">
            <v-tab>Log in</v-tab>
            <v-tab>Sign up</v-tab>
          </v-tabs>

          <v-tabs-items v-model="loginTab">
            <v-tab-item>
              <LoginCard />
            </v-tab-item>
            <v-tab-item>
              <SignupCard />
            </v-tab-item>
          </v-tabs-items>
        </v-card>
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

      <v-dialog v-model="isThreadDialogOpen" fullscreen>
        <v-card v-if="isThreadDialogOpen">
          <v-row>
            <v-col :cols="12" class="text-right">
              <v-btn
                class="mr-4"
                icon
                @click="$store.commit('setThreadDialogOpen', { value: false, path: $route.path })"
              >
                <v-icon>close</v-icon>
              </v-btn>
            </v-col>
          </v-row>
          <BrowseThreadPage :referenceId="threadDialogRef1" :referenceId2="threadDialogRef2" />
        </v-card>
      </v-dialog>

      <v-container v-if="$vuetify.breakpoint.mobile">
        <v-row no-gutters>
          <v-col cols="12">
            <router-view></router-view>
          </v-col>
        </v-row>
      </v-container>
      <v-container fluid v-else>
        <v-row>
          <v-col cols="2">
            <v-card>
              <!-- TO-REFINE: fix the nav bar so that it scrolls with the user -->
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
import { getUserAccountObject } from "@/novusphere-js/discussions/api";
import { sleep } from "@/novusphere-js/utility";

import AppBar from "@/components/AppBar";
import AppNav from "@/components/AppNav";
import LoginCard from "@/components/LoginCard";
import SignupCard from "@/components/SignupCard";
import ApproveTransfersCard from "@/components/ApproveTransfersCard";
import SendTipCard from "@/components/SendTipCard";
import BrowseThreadPage from "@/pages/BrowseThreadPage";

export default {
  name: "App",
  components: {
    AppBar,
    AppNav,
    LoginCard,
    SignupCard,
    ApproveTransfersCard,
    SendTipCard,
    BrowseThreadPage
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

          //console.log(oldAccount);

          // upgrade to new object format
          const migrated = {
            // NOTE: we didn't bother migrating watched posts
            lastSeenNotificationsTime: oldAccount.data.lastCheckedNotifications,
            subscribedTags: oldAccount.data.tags,
            // NOTE: followers
            delegatedMods: oldAccount.data.moderation.delegated.map(m => {
              const [displayName, pub] = m[0].split(":");
              return { displayName, pub, tag: m[1] };
            })
          };

          //console.log(migrated);
          console.log(`Migration OK`);
          account = migrated;
        } else {
          console.log(`Did not find legacy account`);
        }
      } else {
        console.log(`Retrieved account successfully`);
      }

      this.$store.commit("syncAccount", account);
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
      isThreadDialogOpen: state => state.isThreadDialogOpen,
      threadDialogRef1: state => state.threadDialogRef1,
      threadDialogRef2: state => state.threadDialogRef2,
      pendingTransfers: state => state.pendingTransfers,
      sendTipRecipient: state => state.sendTipRecipient,
      keys: state => state.keys
    })
  },
  data: () => ({
    loginTab: null
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

.v-dialog--fullscreen {
  overflow-y: scroll;
  overflow-x: hidden;
}
</style>
