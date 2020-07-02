<template>
  <BrowsePageLayout no-right>
    <template v-slot:header>
      <v-card flat>
        <v-card-text>
          <v-row no-gutters>
            <v-col :cols="12">
              <span class="text-h5 primary--text">Settings</span>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      <v-btn small dense text :to="`/settings/content`">Content</v-btn>
      <v-btn small dense text :to="`/settings/watched`">Watched Threads</v-btn>
    </template>
    <template v-slot:content>
      <router-view></router-view>
    </template>
  </BrowsePageLayout>
</template>

<script>
import { requireLoggedIn } from "@/utility";
import BrowsePageLayout from "@/components/BrowsePageLayout";

export default requireLoggedIn({
  name: "SettingsPage",
  components: {
    BrowsePageLayout
  },
  props: {},
  data: () => ({}),
  created() {}
});
</script>