<template>
  <v-card :flat="flat">
    <v-card-text>
      <v-row no-gutters>
        <v-col :cols="$vuetify.breakpoint.mobile || small ? 12 : 5">
          <PublicKeyIcon :size="80" :publicKey="publicKey" />
          <div class="d-inline-block ml-2">
            <router-link class="text-decoration-none" :to="link">
              <h2 class="d-inline text-center">{{ displayName }}</h2>
              <div v-if="extendedInfo">
                <span class="d-block"
                  >{{ extendedInfo.followers }} followers</span
                >
              </div>
            </router-link>
            <template v-if="showSocial && extendedInfo.auth">
              <div class="d-inline-block" v-if="twitter">
                <v-icon>mdi-twitter</v-icon>
                <a
                  :href="`https://twitter.com/${twitter}`"
                  class="text-decoration-none ml-1"
                  target="_blank"
                  v-if="twitter"
                  >@{{ twitter }}</a
                >
              </div>
            </template>
          </div>
          <v-spacer />
        </v-col>
        <v-col :cols="$vuetify.breakpoint.mobile || small ? 12 : 3"></v-col>
        <v-col :cols="$vuetify.breakpoint.mobile || small ? 12 : 4">
          <v-btn
            v-if="!noFollow && publicKey != myPublicKey && !isFollowing(publicKey)"
            color="primary"
            :class="{ 'mt-2': $vuetify.breakpoint.mobile }"
            outlined
            icon
            @click="followUser({ displayName, pub: publicKey, uidw })"
          >
            <v-icon>person_add</v-icon>
          </v-btn>
          <v-btn
            v-else-if="!noFollow && publicKey != myPublicKey"
            color="primary"
            :class="{ 'mt-2': $vuetify.breakpoint.mobile }"
            outlined
            icon
            @click="unfollowUser(publicKey)"
          >
            <v-icon>person_remove</v-icon>
          </v-btn>
          <v-btn
            v-if="uidw && publicKey != myPublicKey"
            color="primary"
            :class="{ 'mt-2': $vuetify.breakpoint.mobile, 'ml-2': true }"
            outlined
            icon
            @click="sendTip()"
          >
            <v-icon>attach_money</v-icon>
          </v-btn>
          <v-btn
            v-if="publicKey != myPublicKey"
            :color="isBlocked(publicKey) ? 'red' : ''"
            :class="{ 'mt-2': $vuetify.breakpoint.mobile, 'ml-2': true }"
            outlined
            icon
            @click="
              isBlocked(publicKey)
                ? unblockUser(publicKey)
                : blockUser({ pub: publicKey, displayName })
            "
          >
            <v-icon>block</v-icon>
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { userActionsMixin } from "@/mixins/userActions";
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default {
  name: "UserProfileCard",
  mixins: [userActionsMixin],
  components: {
    PublicKeyIcon,
  },
  props: {
    extendedInfo: Object,
    displayName: String,
    publicKey: String,
    uidw: String,
    flat: Boolean,
    small: Boolean,
    showSocial: Boolean,
    noFollow: Boolean,
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isFollowing", "isBlocked"]),
    ...mapState({
      myPublicKey: (state) => (state.keys ? state.keys.arbitrary.pub : ""),
    }),
    link() {
      return `/u/${this.displayName}-${this.publicKey}`;
    },
    twitter() {
      const auth = this.extendedInfo.auth.find((a) => a.name == "twitter");
      return auth ? auth.username : undefined;
    },
  },
  data: () => ({}),
  methods: {
    async sendTip() {
      if (!this.uidw) return;

      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }
      this.$store.commit("setSendTipDialogOpen", {
        value: true,
        recipients: [
          {
            pub: this.publicKey,
            uidw: this.uidw,
            displayName: this.displayName,
            memo: `tip to ${this.displayName}`,
          },
        ],
      });
    },
  },
};
</script>