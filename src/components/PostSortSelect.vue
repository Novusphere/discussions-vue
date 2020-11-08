<template>
  <div class="text-center">
    <v-menu offset-y eager>
      <template v-slot:activator="{ on, attrs }">
        <v-btn text small dense v-bind="attrs" v-on="on">
          <span>{{ valueProxy }}</span>
          <v-icon>arrow_drop_down</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(item, index) in items" :key="index">
          <v-btn text @click="change(item)">{{ item }}</v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  name: "PostSortSelect",
  components: {},
  props: {},
  watch: {
    ...mapGetters(["isLoggedIn"]),
  },
  computed: {
    valueProxy: {
      get() {
        return this.postSort;
      },
      set(value) {
        this.$store.commit("setPostSort", value);
      },
    },
    ...mapState({
      postSort: (state) => state.postSort,
    }),
  },
  data: function () {
    return {
      items: ["popular", "recent", "recent-reply", "controversial"],
    };
  },
  created() {
    let sort = this.postSort;
    if (!this.items.some((s) => s == sort)) {
      sort = "popular";
    }
    this.valueProxy = sort;
  },
  methods: {
    change(value) {
      this.valueProxy = value;
    },
  },
};
</script>
