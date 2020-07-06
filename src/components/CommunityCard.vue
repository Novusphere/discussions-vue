<template>
  <v-card :flat="flat">
    <v-card-text>
      <v-row no-gutters>
        <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 3">
          <TagLink class="d-inline" big :tag="community.tag">
            <span
              class="d-block text-center"
              v-if="community.members"
            >{{ community.members }} members</span>
          </TagLink>
        </v-col>
        <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 7">
          <div
            class="community-html mr-3"
            v-html="community.html"
            :class="{ 'invert': $vuetify.theme.dark }"
          ></div>
        </v-col>
        <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 2">
          <v-btn v-if="!isSubscribed(community.tag)" color="primary" @click="subscribeTag()">
            <v-icon>person_add</v-icon>Join
          </v-btn>
          <v-btn v-else color="primary" @click="$store.commit('unsubscribeTag', community.tag)">
            <v-icon>person_remove</v-icon>
            <span>Leave</span>
          </v-btn>
          <TagLink
            btn
            :class="$vuetify.breakpoint.mobile ? 'ml-2' : 'd-block mt-2'"
            :tag="community.tag"
            v-if="!noView"
          >View</TagLink>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters } from "vuex";
import TagLink from "@/components/TagLink";

export default {
  name: "CommunityCard",
  components: {
    TagLink
  },
  props: {
    community: Object,
    flat: Boolean,
    noView: Boolean
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isSubscribed"])
  },
  data: () => ({}),
  methods: {
    subscribeTag() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }
      this.$store.commit("subscribeTag", this.community.tag);
    }
  }
};
</script>

<style>
.community-html.invert img {
  filter: grayscale(1) invert(1);
}
</style>