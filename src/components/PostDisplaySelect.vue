<template>
  <div class="text-center">
    <v-menu offset-y>
      <template v-slot:activator="{ on, attrs }">
        <v-btn text v-bind="attrs" v-on="on" v-if="view">
          <v-icon>{{ view.icon }}</v-icon>
          <span>{{ view.text }}</span>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(v, i) in views" :key="i">
          <v-btn text @click="change(v)">
            <v-icon>{{ v.icon }}</v-icon>
            <span>{{ v.text }}</span>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  name: "PostDisplaySelect",
  components: {},
  props: {
    value: String,
  },
  computed: {
    valueProxy: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("input", value);
      },
    },
    ...mapState({
      postViewType: (state) => state.postViewType,
    }),
  },
  data: () => ({
    views: [
      { name: "compact", text: "Compact View", icon: "view_headline" },
      { name: "preview", text: "Preview", icon: "view_day" },
      { name: "full", text: "Full View", icon: "view_agenda" },
    ],
    view: null,
  }),
  watch: {
    valueProxy() {
      this.view = this.views.find((v) => v.name == this.valueProxy);
      this.$store.commit("setPostViewType", this.valueProxy);
      //console.log(`PostDisplaySelect`, this.valueProxy);
    },
  },
  created() {
    //console.log(`PostDisplaySelect`, `created`, this.postViewType);
    if (!this.valueProxy) {
      this.valueProxy = this.postViewType || "full";
    }
  },
  methods: {
    change(value) {
      this.valueProxy = value.name;
    },
  },
};
</script>
