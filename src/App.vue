<template>
  <v-app>
    <AppBar @drawer="toggleDrawer()" />
    <v-navigation-drawer app clipped v-model="leftDrawer">
      <AppNav />
    </v-navigation-drawer>
    <v-navigation-drawer app clipped right v-model="rightDrawer">
      <AppNavRight />
    </v-navigation-drawer>
    <v-main :style="{ background: $vuetify.theme.themes[theme].background }">
      <AppAlertBar />
      <v-menu
        z-index="9999"
        v-if="popover.profile.open"
        max-width="400"
        v-model="profilePopover"
        :position-x="popover.profile.x"
        :position-y="popover.profile.y"
        :close-on-content-click="false"
      >
        <UserProfileCard
          :displayName="popover.profile.displayName"
          :publicKey="popover.profile.publicKey"
          :uidw="popover.profile.uidw"
          :extended-info="popover.profile.profileInfo"
          small
          show-social
        />
      </v-menu>

      <v-menu
        z-index="9999"
        v-if="popover.tag.open"
        max-width="400"
        v-model="tagPopover"
        :position-x="popover.tag.x"
        :position-y="popover.tag.y"
        :close-on-content-click="false"
      >
        <CommunityCard dense no-view :community="popover.tag.community" />
      </v-menu>

      <v-dialog
        :retain-focus="false"
        max-width="600"
        v-model="isLoginDialogOpen"
        @click:outside="$store.commit('setLoginDialogOpen', false)"
      >
        <v-card>
          <v-tabs
            v-model="loginTab"
            background-color="primary"
            slider-color="accent"
            dark
            grow
          >
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
        @click:outside="
          $store.commit('setTransferDialogOpen', { value: false })
        "
      >
        <ApproveTransfersCard
          closable
          :pending-transfers="pendingTransfers"
          @close="closeTransfer"
          @submit="submitTransfer"
        />
      </v-dialog>

      <v-dialog
        eager
        max-width="600"
        v-model="isSendTipDialogOpen"
        @click:outside="$store.commit('setSendTipDialogOpen', { value: false })"
      >
        <SendTipCard
          ref="sendTip"
          closable
          @close="closeTip"
          :recipient="sendTipRecipient"
        />
      </v-dialog>

      <FullScreenDialog v-model="isThreadDialogOpenProxy">
        <v-card v-if="isThreadDialogOpen">
          <v-card-title class="justify-end align-end text-right">
            <v-btn
              text
              class="mr-4"
              @click="
                $store.commit('setThreadDialogOpen', {
                  value: false,
                  path: $route.path,
                })
              "
            >
              <v-icon>close</v-icon>Close
            </v-btn>
          </v-card-title>
          <v-card-text class="pa-0" :class="{ dark: darkMode, light: !darkMode }">
            <v-row no-gutters>
              <v-col :cols="12">
                <ThreadBrowser
                  :referenceId="threadDialogRef1"
                  :referenceId2="threadDialogRef2"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </FullScreenDialog>

      <v-dialog
        v-model="isImageUploadDialogOpen"
        max-width="600"
        @click:outside="
          $store.commit('setImageUploadDialogOpen', { value: false })
        "
      >
        <ImageUploadCard />
      </v-dialog>

      <v-dialog
        v-model="isInsertLinkDialogOpen"
        max-width="600"
        @click:outside="
          $store.commit('setInsertLinkDialogOpen', { value: false })
        "
      >
        <InsertLinkCard />
      </v-dialog>

      <ImageViewer ref="imgViewer" :images="imgViewerSrcs" :start-index="imgViewerIndex" />

      <v-container fluid>
        <v-row :no-gutters="$vuetify.breakpoint.mobile">
          <v-col cols="12">
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
import { subscribeAccount } from "@/novusphere-js/discussions/gateway";

import AppBar from "@/components/AppBar";
import AppAlertBar from "@/components/AppAlertBar";
import AppNav from "@/components/AppNav";
import AppNavRight from "@/components/AppNavRight";
import LoginCard from "@/components/LoginCard";
import SignupCard from "@/components/SignupCard";
import ImageUploadCard from "@/components/MarkdownEditor/ImageUploadCard";
import InsertLinkCard from "@/components/MarkdownEditor/InsertLinkCard";
import ApproveTransfersCard from "@/components/ApproveTransfersCard";
import SendTipCard from "@/components/SendTipCard";
import ThreadBrowser from "@/components/ThreadBrowser";
import UserProfileCard from "@/components/UserProfileCard";
import CommunityCard from "@/components/CommunityCard";
import FullScreenDialog from "@/components/FullScreenDialog";
import ImageViewer from "@/components/ImageViewer";

//import TrendingCard from "@/components/TrendingCard";
//import AboutUsCard from "@/components/AboutUsCard";

export default {
  name: "App",
  components: {
    AppBar,
    AppAlertBar,
    AppNav,
    AppNavRight,
    LoginCard,
    SignupCard,
    ImageUploadCard,
    InsertLinkCard,
    ApproveTransfersCard,
    SendTipCard,
    ThreadBrowser,
    UserProfileCard,
    CommunityCard,
    FullScreenDialog,
    ImageViewer,

    //TrendingCard,
    //AboutUsCard,
  },
  watch: {
    imgViewerSrcs() {
      if (this.imgViewerSrcs.length > 0) {
        this.$refs.imgViewer.show();
      }
    },
    darkMode() {
      this.$vuetify.theme.dark = this.darkMode;
      this.setThemeClass();
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

      let account = await getUserAccountObject(this.keys.identity.key, this.encryptedBrainKey);

      if (account && account.data) {
        console.log(`Retrieved account successfully`);
      } else {
        console.log(`Error retrieving the account or no account was found...`);
      }

      subscribeAccount(this.keys.identity.key);
      this.$store.commit("syncAccount", account);
    },
  },
  computed: {
    profilePopover: {
      get() {
        return this.popover.profile.open;
      },
      set(value) {
        if (value) return;
        this.$store.commit("setPopoverOpen", {
          value: false,
          type: "profile",
        });
      },
    },
    tagPopover: {
      get() {
        return this.popover.tag.open;
      },
      set(value) {
        if (value) return;
        this.$store.commit("setPopoverOpen", {
          value: false,
          type: "tag",
        });
      },
    },
    theme() {
      return this.darkMode ? "dark" : "light";
    },
    isLoggedIn() {
      return this.$store.getters.isLoggedIn;
    },
    isThreadDialogOpenProxy: {
      get() {
        return this.isThreadDialogOpen;
      },
      set(value) {
        console.log(`isThreadDialogOpenProxy - ${value}`);
        if (value) return;
        this.$store.commit("setThreadDialogOpen", {
          value: false,
          path: this.$route.path,
        });
      },
    },
    ...mapGetters(["isPopoverOpen"]),
    ...mapState({
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      imgViewerSrcs: (state) => state.imgViewerSrcs,
      imgViewerIndex: (state) => state.imgViewerIndex,
      darkMode: (state) => state.darkMode,
      syncTime: (state) => state.syncTime,
      needSyncAccount: (state) => state.needSyncAccount,
      popover: (state) => state.popover,
      isLoginDialogOpen: (state) => state.isLoginDialogOpen,
      isTransferDialogOpen: (state) => state.isTransferDialogOpen,
      isSendTipDialogOpen: (state) => state.isSendTipDialogOpen,
      isThreadDialogOpen: (state) => state.isThreadDialogOpen,
      isImageUploadDialogOpen: (state) => state.isImageUploadDialogOpen,
      isInsertLinkDialogOpen: (state) => state.isInsertLinkDialogOpen,
      isConnectWalletDialogOpen: (state) => state.isConnectWalletDialogOpen,
      threadDialogRef1: (state) => state.threadDialogRef1,
      threadDialogRef2: (state) => state.threadDialogRef2,
      pendingTransfers: (state) => state.pendingTransfers,
      sendTipRecipient: (state) => state.sendTipRecipient,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    loginTab: null,
    leftDrawer: true,
    rightDrawer: true,
  }),
  created() {
    window.$app = this;
    this.setThemeClass();
    setTimeout(() => this.setThemeClass(), 1000);

    if (this.$vuetify.breakpoint.mobile) {
      this.leftDrawer = false;
      this.rightDrawer = false;
    }

    this.$store.commit("init");
    window.addEventListener(
      "accountChange",
      ({ detail: { payload: account } }) => {
        if (!account.data) return;

        console.log(
          `Remote sync, local=${this.syncTime}, remote=${account.data.syncTime}`
        );

        if (!this.syncTime || account.data.syncTime > this.syncTime) {
          this.$store.commit("syncAccount", account);
        }
      }
    );
  },
  beforeDestroy() {},
  methods: {
    toggleDrawer() {
      this.leftDrawer = !this.leftDrawer;
      if (!this.$vuetify.breakpoint.mobile) {
        this.rightDrawer = !this.rightDrawer;
      }
    },
    setThemeClass() {
      const nodes = [
        document.body,
        ...document.querySelectorAll(".v-navigation-drawer__content"),
      ];

      for (const node of nodes) {
        const classes = node.className
          .split(" ")
          .filter((cn) => cn != "dark" && cn != "light");

        classes.push(this.darkMode ? "dark" : "light");
        node.className = classes.join(" ");
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
    },
  },
};
</script>

<style scoped>
.nav--sticky {
  position: sticky;
  top: 88px;
}
</style>

<style lang="scss">
html {
  margin-right: calc(-1 * (100vw - 100%));
  overflow-y: scroll;
}

body {
  overflow-y: scroll;
  background-color: #ecf0f1;
  .dark {
    background: #000000;
  }
}

@media only screen and (-webkit-min-device-pixel-ratio: 1.5),
  only screen and (-o-min-device-pixel-ratio: 3/2),
  only screen and (min--moz-device-pixel-ratio: 1.5),
  only screen and (min-device-pixel-ratio: 1.5) {
  html,
  body {
    -webkit-overflow-scrolling: touch;
  }
}

.v-application {
  .headline {
    font-size: 1.1rem !important;
  }
  .overline {
    font-size: 0.6rem !important;
    line-height: 0rem !important;
  }
}

.text-decoration-ellipsis {
  text-overflow: ellipsis;

  /* Required for text-overflow to do anything */
  white-space: nowrap;
  overflow: hidden;
}

blockquote {
  border-left: 4px solid #ccc;
  margin-bottom: 5px;
  margin-top: 5px;
  padding-left: 16px;
}

@mixin width-scrollbar {
  &::-webkit-scrollbar {
    width: 15px;
  }
  @media only screen and (max-width: 1264px) {
    &::-webkit-scrollbar {
      width: 10px;
    }
  }
}

@mixin light-scrollbar {
  @include width-scrollbar();
  &::-webkit-scrollbar-track {
    background: #e6e6e6;
    border-left: 1px solid #dadada;
  }
  &::-webkit-scrollbar-thumb {
    background: #b0b0b0;
    border: solid 3px #e6e6e6;
    border-radius: 7px;
    &:hover {
      background: black;
    }
  }
}

@mixin dark-scrollbar {
  @include width-scrollbar();
  &::-webkit-scrollbar-track {
    background: #202020;
    border-left: 1px solid #2c2c2c;
  }
  &::-webkit-scrollbar-thumb {
    background: #3e3e3e;
    border: solid 3px #202020;
    border-radius: 7px;
    &:hover {
      background: white;
    }
  }
}

.light {
  @include light-scrollbar();
  .v-dialog,
  .scrollable {
    @include light-scrollbar();
  }
}
.dark {
  @include dark-scrollbar();
  .v-dialog,
  .scrollable {
    @include dark-scrollbar();
  }
}
</style>
