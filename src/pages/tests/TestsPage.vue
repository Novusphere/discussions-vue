<template>
  <div>
    <v-row no-gutters>
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
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 6">
        <div class="d-inline-block">
          <v-switch class="d-inline" v-model="enableConsoleProxy" :label="`Enable Console`"></v-switch>
          <v-btn class="d-inline" color="primary" @click="consoleProxy = ''">Clear</v-btn>
        </div>
        <v-textarea readonly v-model="consoleProxy" label="Console proxy"></v-textarea>
      </v-col>
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 3">
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
      <v-col :cols="$vuetify.breakpoint.mobile ? 12 : 3">
        <v-card>
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Misc</v-toolbar-title>
          </v-toolbar>
          <v-list>
            <v-list-item>
              <v-btn text :to="'/tests/analytics'">Analytics</v-btn>
            </v-list-item>
            <v-list-item>
              <v-btn text :to="'/tests/editor'">Editor</v-btn>
            </v-list-item>
            <v-list-item>
              <v-btn text @click="openDialogThread()">Dialog Thread</v-btn>
            </v-list-item>
            <v-list-item>
              <v-btn text @click="trxTest()">Test Trx</v-btn>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { getBuildVersion } from "@/utility";
import { testPosts } from "./posts/posts";

import { mapState } from "vuex";

export default {
  name: "TestsPage",
  components: {
  },
  props: {},
  computed: {
    consoleProxy: {
      get() {
        return this.consoleText;
      },
      set(value) {
        window._consoleProxy = value;
      },
    },
    enableConsoleProxy: {
      get() {
        return window._consoleProxyEnabled ? true : false;
      },
      set(value) {
        console.enableProxyLog(value);
      },
    },
    ...mapState({
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    posts: [...testPosts],
    build: "",
    consoleText: "",
  }),
  created() {
    this.build = getBuildVersion();
    this.consoleText = window._consoleProxy || "";
    this.updateConsole = setInterval(() => {
      this.consoleText = window._consoleProxy || "";
    }, 1000);
  },
  beforeDestroy() {
    if (this.updateConsole) clearInterval(this.updateConsole);
  },
  methods: {
    async trxTest() {
      /*const actions = [
        {
          account: `novusphereio`,
          name: "transfer",
          authorization: [
            {
              actor: wallet.auth.accountName,
              permission: wallet.auth.permission
            }
          ],
          data: {
            from: wallet.auth.accountName,
            to: `nsfoundation`,
            quantity: `1.000 ATMOS`,
            memo: `test trx`
          }
        }
      ];

      try {
        const receipt = await wallet.eosApi.transact(
          { actions },
          {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60
          }
        );
        console.log(receipt);
      } catch (ex) {
        console.log(ex);
      }*/
    },
    async openDialogThread() {
      this.$store.commit("setThreadDialogOpen", {
        value: true,
        sub: "test",
        referenceId: "ggy5io6wgwm9",
      });
    },
  },
};
</script>