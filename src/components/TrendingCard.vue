<template>
  <v-card flat>
    <v-list>
      <v-subheader><v-icon>trending_up</v-icon>Trending </v-subheader>
      <v-list-item v-for="(tag, i) in tags" :key="i">
          <span class="text-decoration-ellipsis">
            <TagLink btn :tag="tag">
              <TagIcon :tag="tag" />
              <span>{{ tag }}</span>
            </TagLink>
          </span>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import TagLink from "@/components/TagLink";
import TagIcon from "@/components/TagIcon";
import { getTrendingTags } from "@/novusphere-js/discussions/api";

export default {
  name: "TrendingCard",
  components: {
    TagLink,
    TagIcon,
  },
  async created() {
    this.tags = (await getTrendingTags()).map((tt) => tt.tag);
  },
  data: () => ({
    tags: [],
  }),
};
</script>
