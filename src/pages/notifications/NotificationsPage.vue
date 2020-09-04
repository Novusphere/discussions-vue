<template>
  <BrowsePageLayout no-right>
    <template v-slot:header2>
      <v-tabs center-active show-arrows class="mt-1">
        <v-tab :to="`/notifications/posts`">Posts</v-tab>
        <v-tab :to="`/notifications/trx`">Tips</v-tab>
      </v-tabs>
    </template>
    <template v-slot:content>
      <router-view></router-view>
    </template>
  </BrowsePageLayout>
</template>

<script>
import BrowsePageLayout from "@/components/BrowsePageLayout";
import { requireLoggedIn } from "@/utility";

export default requireLoggedIn({
  name: "NotificationsPage",
  components: {
    BrowsePageLayout,
  },
  props: {},
  computed: {},
  data: () => ({}),
  watch: {
    "$route.query.t": async function () {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  methods: {
    async load() {
      this.$store.commit("seenNotifications");
    },
  },
});
</script>