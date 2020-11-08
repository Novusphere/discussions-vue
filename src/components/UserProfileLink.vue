<template>
  <div>
    <v-btn text v-if="btn" :to="link">
      <PublicKeyIcon :size="iconSize" v-show="!noIcon" :publicKey="publicKey" />
      <span>{{ displayName }}</span>
    </v-btn>
    <a v-else class="user-link" @click="clicked">
      <div class="d-inline-block" v-if="big">
        <PublicKeyIcon v-show="!noIcon" :size="80" :publicKey="publicKey" />
        <div class="d-inline-block ml-2">
          <h1 class="d-inline">{{ displayName }}</h1>
          <slot></slot>
        </div>
      </div>
      <div class="d-inline-block" v-else>
        <PublicKeyIcon v-show="!noIcon" :publicKey="publicKey" />
        <span class="ml-1">{{ displayName }}</span>
      </div>
    </a>
  </div>
</template>

<script>
import PublicKeyIcon from "@/components/PublicKeyIcon";
//import UserProfileCard from "@/components/UserProfileCard";
import { getUserProfile } from "@/novusphere-js/discussions/api";

export default {
  name: "UserProfileLink",
  components: {
    PublicKeyIcon,
    //UserProfileCard
  },
  props: {
    iconSize: Number,
    noIcon: Boolean,
    displayName: String,
    publicKey: String,
    big: Boolean,
    btn: Boolean,
    popover: { type: Boolean, default: false },
  },
  computed: {
    link() {
      return `/u/${this.displayName}-${this.publicKey}`;
    },
  },
  data: () => ({}),
  methods: {
    async clicked(e) {
      e.stopPropagation();

      if (!this.popover) {
        this.$router.push(this.link);
        return;
      }

      const info = await getUserProfile(this.publicKey);
      const rect = this.$el.getBoundingClientRect();

      this.$store.commit("setPopoverOpen", {
        value: true,
        type: "profile",
        rect,
        uidw: info.uidw,
        displayName: this.displayName,
        publicKey: this.publicKey,
        profileInfo: info,
      });
    },
  },
};
</script>