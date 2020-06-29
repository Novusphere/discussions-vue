<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card>
          <v-card-text>
            <strong>Build:</strong>
            {{ build }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="auto">
        <v-card>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Browse</v-toolbar-title>
          </v-toolbar>
          <v-list>
            <v-list-item>
              <v-btn text :to="`/tests/posts/browse/${posts.map(p => p.transaction).join(',')}`">All</v-btn>
            </v-list-item>
            <v-list-item v-for="(p, i) in posts" :key="i">
              <v-btn text :to="`/tests/posts/browse/${p.transaction}`">{{ p.name }}</v-btn>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="auto">
        <v-card>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Misc</v-toolbar-title>
          </v-toolbar>
          <v-list>
            <v-list-item>
              <v-btn text :to="'/tests/editor'">Editor</v-btn>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { testPosts } from "./posts/posts";

export default {
  name: "TestsPage",
  components: {},
  props: {},
  data: () => ({
    posts: [...testPosts],
    build: ""
  }),
  created() {
    if (window.__BUILD__) {
      this.build = `Server - ${new Date(window.__BUILD__)}`;
    } else {
      this.build = `Client - ${new Date()}`;
    }
  }
};
</script>