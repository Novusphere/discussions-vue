<template>
  <div>
    <v-row no-gutters v-for="(comm, i) in communities" :key="i" class="mb-2">
      <v-col cols="12">
        <CommunityCard :dense="dense" :noView="noView" :community="comm" />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import CommunityCard from "@/components/CommunityCard";
import { getCommunities } from "@/novusphere-js/discussions/api";

export default {
  name: "DiscoverCommunityPage",
  components: {
    CommunityCard,
  },
  props: {
    dense: Boolean,
    noView: Boolean
  },
  data: () => ({
    communities: [],
  }),
  async created() {
    this.communities = (await getCommunities())
      .map((comm) => ({ ...comm }))
      .filter((comm) => comm.tag != "test" && comm.desc);
  },
  methods: {},
};
</script>

<style lang="scss">
.community-html {
  img {
    width: 32px;
    height: 32px;
  }
}
</style>