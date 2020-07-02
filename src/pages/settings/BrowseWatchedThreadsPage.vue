<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <PostBrowser no-sort :cursor="cursor" />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { requireLoggedIn } from "@/utility";
import BrowsePageLayout from "@/components/BrowsePageLayout";
import PostBrowser from "@/components/PostBrowser";
import { searchPostsByTransactions } from "@/novusphere-js/discussions/api";

export default requireLoggedIn({
  name: "BrowseWatchedThreadsPage",
  components: {
    BrowsePageLayout,
    PostBrowser
  },
  props: {},
  data: () => ({
    cursor: null
  }),
  computed: {
    ...mapState({
      keys: state => state.keys,
      watchedThreads: state => state.watchedThreads
    })
  },
  async created() {
    const trxids = this.watchedThreads.map(wt => wt.transaction);
    this.cursor = searchPostsByTransactions(trxids);
  },
  methods: {}
});
</script>