<template>
  <BrowsePageLayout no-right>
    <template v-slot:header2>
      <v-tabs center-active show-arrows class="mt-1">
        <v-tab :to="`/discover/community`">Communities</v-tab>
        <v-tab :to="`/discover/user`">Users</v-tab>
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
  name: "DiscoverPage",
  components: {
    BrowsePageLayout,
  },
  props: {},
  computed: {},
  data: () => ({}),
});
</script>