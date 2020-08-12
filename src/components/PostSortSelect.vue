<template>
  <div class="text-center">
    <v-menu offset-y>
      <template v-slot:activator="{ on, attrs }">
        <v-btn text v-bind="attrs" v-on="on">
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
export default {
  name: "PostSortSelect",
  components: {},
  props: {
    value: String
  },
  watch: {
    "$route.query.sort": function() {
      this.valueProxy = this.$route.query.sort || "popular";
    },
    async valueProxy(nv, ov) {
      if (nv == ov) return;
      if (!ov && nv == "popular") return;

      try {
        await this.$router.push({
          query: { ...this.$route.query, sort: this.valueProxy }
        });
      } catch (ex) {
        return; // Avoided redundant navigation
      }
    }
  },
  computed: {
    valueProxy: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit("input", value);
      }
    }
  },
  data: function() {
    return {
      items: ["popular", "recent", "recent reply", "controversial"]
    };
  },
  created() {
    if (!this.valueProxy) {
      this.valueProxy = this.$route.query.sort || "popular";
    }
  },
  methods: {
    change(value) {
      this.valueProxy = value;
    }
  }
};
</script>
