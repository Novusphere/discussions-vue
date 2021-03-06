<template>
  <BrowsePageLayout>
    <template v-slot:header v-if="community">
      <CommunityCard
        flat
        no-view
        :community="community"
        v-if="community && community.tag != 'blog'"
      />
      <UserProfileCard
        v-else-if="opening"
        flat
        no-view
        :displayName="opening.post.displayName"
        :publicKey="opening.post.pub"
        :uidw="opening.post.uidw"
        :extended-info="posterInfo"
      ></UserProfileCard>
    </template>
    <template v-slot:content>
      <ThreadBrowser
        ref="browser"
        :referenceId="$route.params.referenceId"
        :referenceId2="$route.params.referenceId2"
        @loaded="loaded"
      />
    </template>
  </BrowsePageLayout>
</template>

<script>
import BrowsePageLayout from "@/components/BrowsePageLayout";
import CommunityCard from "@/components/CommunityCard";
import UserProfileCard from "@/components/UserProfileCard";

import ThreadBrowser from "@/components/ThreadBrowser";
import {
  getCommunityByTag,
  getUserProfile
} from "@/novusphere-js/discussions/api";
import { getSymbols } from "@/novusphere-js/uid";

export default {
  name: "BrowseThreadPage",
  components: {
    BrowsePageLayout,
    CommunityCard,
    UserProfileCard,
    ThreadBrowser
  },
  props: {},
  data: () => ({
    opening: null,
    community: null,
    symbol: null,
    posterInfo: null
  }),
  mounted() {
    window.addEventListener("beforeunload", this.leaveGuard);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.leaveGuard);
  },
  beforeRouteLeave(to, from, next) {
    if (this.$refs.browser && this.$refs.browser.hasUnsavedInput()) {
      const answer = window.confirm(
        "Do you really want to leave? you have unsaved changes!"
      );
      if (answer) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },
  methods: {
    async loaded({ opening }) {
      this.opening = opening;
      const symbol = opening.post.sub.toUpperCase();
      if ((await getSymbols()).some(s => s == symbol)) {
        this.symbol = symbol;
      } else {
        this.symbol = null;
      }
      this.community = await getCommunityByTag(this.opening.post.sub);

      const info = await getUserProfile(this.opening.post.pub);
      this.posterInfo = info;
    },
    leaveGuard(e) {
      if (this.$refs.browser && this.$refs.browser.hasUnsavedInput()) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = "";
      }
    }
  }
};
</script>