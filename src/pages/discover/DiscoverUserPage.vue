<template>
  <div>
    <v-row no-gutters v-for="(u, i) in users" :key="i" class="mb-2">
      <v-col cols="12">
        <UserProfileCard
          show-social
          :displayName="u.displayName"
          :publicKey="u.pub"
          :uidw="u.uidw"
          :extendedInfo="u.extendedInfo"
        ></UserProfileCard>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import UserProfileCard from "@/components/UserProfileCard";
import { getPopularUsers } from "@/novusphere-js/discussions/api";

export default {
  name: "DiscoverUserPage",
  components: {
    UserProfileCard,
  },
  props: {},
  data: () => ({
    users: [],
  }),
  async created() {
    this.users = (await getPopularUsers()).map((u) => ({
      ...u,
      extendedInfo: {
        auth: u.auth,
        followers: u.followers,
      },
    }));
  },
  methods: {},
};
</script>