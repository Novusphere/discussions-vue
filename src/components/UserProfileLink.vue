<template>
  <div>
    <v-menu max-width="400" v-model="showPopover" :position-x="popoverX" :position-y="popoverY">
      <UserProfileCard
        v-if="showPopover"
        :displayName="displayName"
        :publicKey="publicKey"
        :uidw="uidw"
        small
      >
        <span class="d-block text-center">{{ followers }} followers</span>
      </UserProfileCard>
    </v-menu>
    <v-btn text v-if="btn" :to="link">
      <PublicKeyIcon v-show="!noIcon" :publicKey="publicKey" />
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
import UserProfileCard from "@/components/UserProfileCard";
import {
  getUserProfile
} from "@/novusphere-js/discussions/api";

export default {
  name: "UserProfileLink",
  components: {
    PublicKeyIcon,
    UserProfileCard
  },
  props: {
    noIcon: Boolean,
    displayName: String,
    publicKey: String,
    big: Boolean,
    btn: Boolean,
    popover: { type: Boolean, default: false }
  },
  computed: {
    link() {
      return `/u/${this.displayName}-${this.publicKey}`;
    }
  },
  data: () => ({
    showPopover: false,
    popoverX: 0,
    popoverY: 0,
    uidw: "",
    followers: 0
  }),
  methods: {
    async clicked(e) {
      e.stopPropagation();

      if (!this.popover) {
        this.$router.push(this.link);
        return;
      }

      const info = await getUserProfile(this.publicKey);

      this.uidw = info.uidw;
      //this.publicKey = publicKey;
      //this.displayName = info.displayName;
      this.followers = info.followers;
      //this.posts = info.posts;
      //this.threads = info.threads;

      const rect = this.$el.getBoundingClientRect();
      this.popoverX = rect.x + rect.width + 10;
      this.popoverY = rect.y - 10;
      this.showPopover = true;
    }
  }
};
</script>