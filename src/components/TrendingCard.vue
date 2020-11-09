<template>
  <v-card flat> 
    <v-list>
      <v-list-item>
        <span class="text-h6">
          <v-icon>trending_up</v-icon>Trending
        </span>
      </v-list-item>
      <v-list-item v-for="(tag, i) in tags" :key="i">
        <span class="text-decoration-ellipsis">
          <TagLink :tag="tag" />
        </span>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import TagLink from "@/components/TagLink";
import { getTrendingTags } from "@/novusphere-js/discussions/api";

export default {
  name: "TrendingCard",
  components: {
    TagLink
  },
  async created() {
    this.tags = (await getTrendingTags()).map(tt => tt.tag);
  },
  data: () => ({
    tags: []
  })
};
</script>
