<template>
  <v-card>
    <v-card-title>
      <v-icon>trending_up</v-icon>Trending
    </v-card-title>

    <v-list>
      <v-list-item v-for="(tag, i) in tags" :key="i">
        <span class="v-list-item-text trending-tag">
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

<style scoped>
.trending-tag {
  text-overflow: ellipsis;

  /* Required for text-overflow to do anything */
  white-space: nowrap;
  overflow: hidden;
}
</style>
