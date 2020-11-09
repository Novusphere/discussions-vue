<template>
  <div class="text-center">
    <v-menu offset-y eager>
      <template v-slot:activator="{ on, attrs }">
        <v-btn text small dense v-bind="attrs" v-on="on" v-if="view">
          <v-icon>{{ view.icon }}</v-icon>
          <span>{{ view.text }}</span>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(v, i) in views" :key="i">
          <v-btn text @click="setView(v.name)">
            <v-icon>{{ v.icon }}</v-icon>
            <span>{{ v.text }}</span>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
export default {
  name: "PostDisplaySelect",
  components: {},
  props: {},
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      postViewType: (state) => state.postViewType,
    }),
  },
  data: () => ({
    views: [
      { name: "compact", text: "Compact", icon: "view_headline" },
      { name: "preview", text: "Preview", icon: "view_day" },
      { name: "full", text: "Full", icon: "view_agenda" },
    ],
    view: null,
  }),
  created() {
    let view = "preview";
    if (typeof this.postViewType == "string") {
      if (this.views.some((s) => s.name == this.postViewType)) {
        view = this.postViewType;
        //console.log(`PostDisplaySelect`, view);
      }
    }
    this.setView(view);
  },
  methods: {
    setView(view) {
      this.view = this.views.find((v) => v.name == view);
      this.$store.commit("setPostViewType", view);
    },
  },
};
</script>
