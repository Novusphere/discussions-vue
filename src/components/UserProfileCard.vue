<template>
  <v-card :flat="flat">
    <v-card-text>
      <v-row no-gutters>
        <v-col :cols="$vuetify.breakpoint.mobile || small ? 12 : 5">
          <PublicKeyIcon :size="80" :publicKey="publicKey" />
          <div class="d-inline-block ml-2">
            <router-link style="text-decoration: none;" :to="link">
              <h1 class="d-inline">{{ displayName }}</h1>
              <slot></slot>
            </router-link>
          </div>
          <v-spacer />
        </v-col>
        <v-col :cols="$vuetify.breakpoint.mobile || small ? 12 : 5"></v-col>
        <v-col :cols="$vuetify.breakpoint.mobile || small ? 12 : 2">
          <v-btn
            v-if="(publicKey != myPublicKey) && !isFollowing(publicKey)"
            color="primary"
            @click="isLoggedIn ? $store.commit('followUser', { displayName, pub: publicKey, uidw, nametime: Date.now() }) : $store.commit('setLoginDialogOpen', true)"
          >
            <v-icon>person_add</v-icon>
            <span>Follow</span>
          </v-btn>
          <v-btn
            v-else-if="(publicKey != myPublicKey)"
            color="primary"
            @click="isLoggedIn ? $store.commit('unfollowUser', publicKey) : $store.commit('setLoginDialogOpen', true)"
          >
            <v-icon>person_remove</v-icon>
            <span>Unfollow</span>
          </v-btn>
          <v-btn
            v-if="uidw && (publicKey != myPublicKey)"
            color="primary"
            class="ml-1"
            @click="sendTip()"
          >
            <v-icon>attach_money</v-icon>
            <span>Tip</span>
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default {
  name: "UserProfileCard",
  components: {
    PublicKeyIcon
  },
  props: {
    displayName: String,
    publicKey: String,
    uidw: String,
    flat: Boolean,
    small: Boolean
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isFollowing"]),
    ...mapState({
      myPublicKey: state => (state.keys ? state.keys.arbitrary.pub : "")
    }),
    link() {
      return `/u/${this.displayName}-${this.publicKey}`;
    }
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
        recipient: {
          pub: this.publicKey,
          uidw: this.uidw,
          displayName: this.displayName
        }
      });
    }
  }
};
</script>