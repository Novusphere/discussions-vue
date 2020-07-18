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
    </template>
    <template v-slot:header2>
      <v-tabs center-active show-arrows class="mt-1">
        <v-tab :to="`/settings/content`">Content</v-tab>
        <v-tab :to="`/settings/watched`">Watched</v-tab>
        <v-tab :to="`/settings/moderated/pinned`">Pinned</v-tab>
        <v-tab :to="`/settings/moderated/spam`">Spam</v-tab>
        <v-tab :to="`/settings/moderated/nsfw`">NSFW</v-tab>
        <v-tab :to="`/settings/keys`">Keys</v-tab>
      </v-tabs>
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