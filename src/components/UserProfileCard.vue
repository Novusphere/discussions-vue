<template>
  <v-card :flat="flat">
    <v-card-text>
      <v-row no-gutters>
        <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 5">
          <UserProfileLink class="d-inline" big :displayName="displayName" :publicKey="publicKey">
            <slot></slot>
          </UserProfileLink>
          <v-spacer />
        </v-col>
        <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6"></v-col>
        <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 1">
          <v-btn
            v-if="!isFollowing(publicKey)"
            color="primary"
            @click="isLoggedIn ? $store.commit('followUser', { displayName, pub: publicKey, uidw }) : $store.commit('setLoginDialogOpen', true)"
          >
            <v-icon>person_add</v-icon>
            <span>Follow</span>
          </v-btn>
          <v-btn
            v-else
            color="primary"
            @click="isLoggedIn ? $store.commit('unfollowUser', publicKey) : $store.commit('setLoginDialogOpen', true)"
          >
            <v-icon>person_remove</v-icon>
            <span>Unfollow</span>
          </v-btn>
          <v-btn
            color="primary"
            :class="{ 'mt-1': !$vuetify.breakpoint.mobile, 'ml-1': $vuetify.breakpoint.mobile }"
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
import { mapGetters } from "vuex";
import UserProfileLink from "@/components/UserProfileLink";

export default {
  name: "UserProfileCard",
  components: {
    UserProfileLink
  },
  props: {
    displayName: String,
    publicKey: String,
    uidw: String,
    flat: Boolean,
    noView: Boolean
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isFollowing"])
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