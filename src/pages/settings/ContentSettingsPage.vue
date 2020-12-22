<template>
  <div>
    <v-row>
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 3">
        <v-card class="mb-2">
          <v-card-title>General Settings</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12">
                <v-switch
                  v-model="hideSpamProxy"
                  :label="`Hide spam content`"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="blurNSFWProxy"
                  :label="`Blur NSFW content`"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="darkModeProxy"
                  :label="`Dark mode`"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="alwaysUseThreadDialogProxy"
                  :label="`Always thread dialog`"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="limitMentionsProxy"
                  :label="`Everyone can @tag me`"
                ></v-switch>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="analyticsProxy"
                  :label="`Allow Analytics`"
                ></v-switch>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 8">
        <v-card>
          <v-card-title>Moderation Settings</v-card-title>
          <v-card-text>
            <v-form ref="form" v-model="valid" @submit.prevent>
              <v-row>
                <v-col>
                  <v-select
                    no-data-text="Try following some users!"
                    hint="Add a moderator from users you follow"
                    persistent-hint
                    v-model="addModPublicKey"
                    :items="followingUsers"
                    item-text="displayName"
                    item-value="pub"
                    label="Moderator"
                    required
                  >
                    <template v-slot:item="{ item }">
                      <PublicKeyIcon :publicKey="item.pub" />
                      <span>{{ item.displayName }}</span>
                    </template>
                  </v-select>
                </v-col>
                <v-col>
                  <v-text-field
                    v-model="addModTag"
                    label="Tag, i.e. #all"
                    required
                    @keydown.enter="addModerator()"
                  >
                    <template v-slot:append-outer>
                      <v-btn
                        icon
                        color="primary"
                        :disabled="!valid"
                        @click="addModerator()"
                      >
                        <v-icon>add</v-icon>
                      </v-btn>
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-form>
            <v-row>
              <v-col
                v-for="(dm, i) in delegatedMods"
                :key="i"
                :cols="$vuetify.breakpoint.mobile ? 12 : 6"
              >
                <TagLink inline class="mr-2" :tag="dm.tag" />
                <UserProfileLink
                  class="d-inline-block"
                  :publicKey="dm.pub"
                  :displayName="dm.displayName"
                />
                <v-btn @click="removeModerator(dm)" color="error" icon>
                  <v-icon>clear</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import TagLink from "@/components/TagLink";
import PublicKeyIcon from "@/components/PublicKeyIcon";
import UserProfileLink from "@/components/UserProfileLink";

import { mapState } from "vuex";
export default {
  name: "ContentSettingsPage",
  components: {
    TagLink,
    PublicKeyIcon,
    UserProfileLink,
  },
  props: {},
  computed: {
    analyticsProxy: {
      get() {
        return window.localStorage["analytics"] != "disabled";
      },
      set(value) {
        if (value) {
          window.localStorage["analytics"] = "enabled";
        } else {
          window.localStorage["analytics"] = "disabled";
        }

        window.location.reload();
      },
    },
    alwaysUseThreadDialogProxy: {
      get() {
        return this.alwaysUseThreadDialog;
      },
      set(value) {
        this.$store.commit("setAlwaysUseThreadDialog", value);
      },
    },
    postSortProxy: {
      get() {
        return this.postSort;
      },
      set(value) {
        console.log(value);
        this.$store.commit("setPostSort", value);
      },
    },
    darkModeProxy: {
      get() {
        return this.darkMode;
      },
      set(value) {
        this.$store.commit("setDarkMode", value);
      },
    },
    // the verbal description of this in the UI is inverted, so we "!" input/output
    limitMentionsProxy: {
      get() {
        return !this.limitMentions;
      },
      set(value) {
        this.$store.commit("set", ["limitMentions", !value, true]);
      },
    },
    hideSpamProxy: {
      get() {
        return this.hideSpam;
      },
      set(value) {
        this.$store.commit("set", ["hideSpam", value]);
      },
    },
    blurNSFWProxy: {
      get() {
        return this.blurNSFW;
      },
      set(value) {
        this.$store.commit("set", ["blurNSFW", value]);
      },
    },
    ...mapState({
      alwaysUseThreadDialog: (state) => state.alwaysUseThreadDialog,
      limitMentions: (state) => state.limitMentions,
      postSort: (state) => state.postSort,
      followingUsers: (state) => state.followingUsers,
      blockedUsers: (state) => state.blockedUsers,
      delegatedMods: (state) => state.delegatedMods,
      hideSpam: (state) => state.hideSpam,
      blurNSFW: (state) => state.blurNSFW,
      darkMode: (state) => state.darkMode,
    }),
  },
  data: () => ({
    valid: false,
    addModPublicKey: "",
    addModTag: "",
  }),
  async created() {},
  methods: {
    addModerator() {
      let user = this.followingUsers.find((u) => u.pub == this.addModPublicKey);
      if (!user) return;

      let tag = this.addModTag;
      if (tag.indexOf("#") == 0) tag = tag.substring(1);
      tag = tag.trim();

      this.$store.commit("addModerator", {
        displayName: user.displayName,
        pub: user.pub,
        tag,
        nameTime: Date.now(),
      });
    },
    removeModerator(dm) {
      this.$store.commit("removeModerator", dm);
    },
  },
};
</script>