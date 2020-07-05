<template>
  <BrowsePageLayout>
    <template v-slot:header v-if="community">
      <CommunityCard flat no-view :community="community" v-if="community" />
    </template>
    <template v-slot:content>
      <ThreadBrowser
        ref="browser"
        :referenceId="$route.params.referenceId"
        :referenceId2="$route.params.referenceId2"
        @loaded="loaded"
      />
    </template>
    <template v-slot:right>
      <AssetCard class="mb-2" v-if="symbol" :symbol="symbol" />
    </template>
  </BrowsePageLayout>
</template>

<script>
import BrowsePageLayout from "@/components/BrowsePageLayout";
import CommunityCard from "@/components/CommunityCard";
import AssetCard from "@/components/AssetCard";
import ThreadBrowser from "@/components/ThreadBrowser";
import { getCommunityByTag } from "@/novusphere-js/discussions/api";
import { getSymbols } from "@/novusphere-js/uid";

export default {
  name: "BrowseThreadPage",
  components: {
    BrowsePageLayout,
    CommunityCard,
    AssetCard,
    ThreadBrowser
  },
  props: {},
  data: () => ({
    opening: null,
    community: null,
    symbol: null
  }),
  mounted() {
    window.addEventListener("beforeunload", this.leaveGuard);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.leaveGuard);
  },
  beforeRouteLeave(to, from, next) {
    if (this.$refs.browser && this.$refs.browser.hasInput()) {
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
    },
    leaveGuard(e) {
      if (this.$refs.browser && this.$refs.browser.hasInput()) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = "";
      }
    }
  }
};
</script>