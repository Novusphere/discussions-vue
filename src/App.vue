<template>
  <v-app>
    <AppBar />
    <v-main :style="{background: $vuetify.theme.themes[theme].background}">
      <v-dialog
        :retain-focus="false"
        max-width="600"
        v-model="isLoginDialogOpen"
        @click:outside="$store.commit('setLoginDialogOpen', false)"
      >
        <v-card>
          <v-tabs v-model="loginTab" background-color="primary" slider-color="accent" dark grow>
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
        :retain-focus="false"
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

      <v-dialog
        v-model="isThreadDialogOpen"
        fullscreen
        scrollable
        eager
        @click:outside="$store.commit('setThreadDialogOpen', { value: false, path: $route.path })"
      >
        <v-card v-if="isThreadDialogOpen">
          <v-card-title class="justify-end">
            <v-btn
              class="mr-4"
              icon
              @click="$store.commit('setThreadDialogOpen', { value: false, path: $route.path })"
            >
              <v-icon>close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col :cols="12">
                <ThreadBrowser
                  class="mt-3"
                  :referenceId="threadDialogRef1"
                  :referenceId2="threadDialogRef2"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="isImageUploadDialogOpen"
        max-width="600"
        @click:outside="$store.commit('setImageUploadDialogOpen', { value: false })"
      >
        <ImageUploadCard />
      </v-dialog>

      <v-dialog
        v-model="isInsertLinkDialogOpen"
        max-width="600"
        @click:outside="$store.commit('setInsertLinkDialogOpen', { value: false })"
      >
        <InsertLinkCard />
      </v-dialog>

      <v-container v-if="$vuetify.breakpoint.mobile">
        <v-row no-gutters>
          <v-col cols="12">
            <router-view></router-view>
          </v-col>
        </v-row>
      </v-container>
      <v-container fluid v-else-if="$vuetify.breakpoint.xl">
        <v-row>
          <v-col cols="2"></v-col>
          <v-col cols="2">
            <v-card>
              <AppNav />
            </v-card>
          </v-col>
          <v-col cols="6">
            <router-view></router-view>
          </v-col>
          <v-col cols="2"></v-col>
        </v-row>
      </v-container>
      <v-container fluid v-else>
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
import { mapState } from "vuex";
import { getUserAccountObject } from "@/novusphere-js/discussions/api";

import AppBar from "@/components/AppBar";
import AppNav from "@/components/AppNav";
import LoginCard from "@/components/LoginCard";
import SignupCard from "@/components/SignupCard";
import ImageUploadCard from "@/components/MarkdownEditor/ImageUploadCard";
import InsertLinkCard from "@/components/MarkdownEditor/InsertLinkCard";
import ApproveTransfersCard from "@/components/ApproveTransfersCard";
import SendTipCard from "@/components/SendTipCard";
import ThreadBrowser from "@/components/ThreadBrowser";

export default {
  name: "App",
  components: {
    AppBar,
    AppNav,
    LoginCard,
    SignupCard,
    ImageUploadCard,
    InsertLinkCard,
    ApproveTransfersCard,
    SendTipCard,
    ThreadBrowser
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

      let account = await getUserAccountObject(this.keys.identity.key);

      if (account && account.data) {
        account = account.data;
        console.log(`Retrieved account successfully`);
      } else {
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
            followingUsers: oldAccount.data.following.map(fu => ({
              pub: fu.pub,
              displayName: fu.name
            })),
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
      }

      this.$store.commit("syncAccount", account);
    }
  },
  computed: {
    theme() {
      return this.darkMode ? "dark" : "light";
    },
    isLoggedIn() {
      return this.$store.getters.isLoggedIn;
    },
    ...mapState({
      darkMode: state => state.darkMode,
      needSyncAccount: state => state.needSyncAccount,
      isLoginDialogOpen: state => state.isLoginDialogOpen,
      isTransferDialogOpen: state => state.isTransferDialogOpen,
      isSendTipDialogOpen: state => state.isSendTipDialogOpen,
      isThreadDialogOpen: state => state.isThreadDialogOpen,
      isImageUploadDialogOpen: state => state.isImageUploadDialogOpen,
      isInsertLinkDialogOpen: state => state.isInsertLinkDialogOpen,
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
    //this.keepSyncAccount();
  },
  beforeDestroy() {},
  methods: {
    /*async keepSyncAccount() {
      if (this.isLoggedIn && !this.needSyncAccount) {
        console.log(`keepaccountsync`);
        let account = await getUserAccountObject(this.keys.identity.key);
        if (account && account.data) {
          this.$store.commit("syncAccount", account.data);
        }
      }
      setTimeout(() => this.keepSyncAccount(), 2000);
    },*/
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

<style scoped>
.nav--sticky {
  position: sticky;
  top: 88px;
}
</style>

<style>
html {
  margin-right: calc(-1 * (100vw - 100%));
  overflow-x: hidden;
}

body {
  position: relative;
}

.v-dialog--fullscreen {
  overflow-y: scroll;
  overflow-x: hidden;
}

blockquote {
  border-left: 4px solid #ccc;
  margin-bottom: 5px;
  margin-top: 5px;
  padding-left: 16px;
}
</style>
