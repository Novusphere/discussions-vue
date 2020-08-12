<template>
  <v-card>
    <v-list>
      <v-list-item>
        <span class="text-h6">
          <v-icon>chat</v-icon>
          <span>New</span>
        </span>
      </v-list-item>
      <v-list-item v-for="(p, i) in posts" :key="i">
        <span class="text-decoration-ellipsis">
          <PostThreadLink :post="p">
            <PublicKeyIcon :publicKey="p.pub" />
            {{ p.title }}
          </PostThreadLink>
        </span>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { searchPostsByTags } from "@/novusphere-js/discussions/api";
import PostThreadLink from "@/components/PostThreadLink";
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default {
  name: "RecentPostsCard",
  components: {
    PostThreadLink,
    PublicKeyIcon,
  },
  props: {
    tags: Array,
  },
  watch: {
    async tags() {
      await this.load();
    },
  },
  async created() {
    await this.load();
  },
  data: () => ({
    posts: [],
  }),
  methods: {
    async load() {
      const cursor = await searchPostsByTags(this.tags, "recent-reply");
      cursor.pipeline[0].$match.title = { $ne: "" };
      cursor.limit = 10;

      const posts = await cursor.next();
      this.posts = posts;
    },
  },
};
</script>
