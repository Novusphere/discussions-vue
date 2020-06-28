<template>
  <BrowsePageLayout>
    <template v-slot:content>
      <router-view></router-view>
    </template>
  </BrowsePageLayout>
</template>

<script>
import BrowsePageLayout from "@/components/BrowsePageLayout";

export default {
  name: "MainLayoutPage",
  components: {
    BrowsePageLayout
  },
  props: {},
  data: () => ({}),
  async created() {},
  methods: {}
};
</script>