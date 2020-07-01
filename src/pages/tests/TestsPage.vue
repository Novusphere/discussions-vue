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
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 8">
        <div class="d-inline-block">
          <v-switch class="d-inline" v-model="enableConsoleProxy" :label="`Enable Console`"></v-switch>
          <v-btn class="d-inline" color="primary" @click="consoleProxy = ''">Clear</v-btn>
        </div>
        <v-textarea readonly v-model="consoleProxy" label="Console proxy"></v-textarea>
      </v-col>
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 2">
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
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 2">
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
  computed: {
    consoleProxy: {
      get() {
        return this.consoleText;
      },
      set(value) {
        window._consoleProxy = value;
      }
    },
    enableConsoleProxy: {
      get() {
        return window._consoleProxyEnabled ? true : false;
      },
      set(value) {
        console.enableProxyLog(value);
      }
    }
  },
  data: () => ({
    posts: [...testPosts],
    build: "",
    consoleText: ""
  }),
  created() {
    if (window.__BUILD__) {
      this.build = `Server - ${new Date(window.__BUILD__).getTime()}`;
    } else {
      this.build = `Client - ${new Date().getTime()}`;
    }

    this.consoleText = window._consoleProxy || "";
    this.updateConsole = setInterval(() => {
      this.consoleText = window._consoleProxy || "";
    }, 1000);
  },
  beforeDestroy() {
    if (this.updateConsole) clearInterval(this.updateConsole);
  }
};
</script>