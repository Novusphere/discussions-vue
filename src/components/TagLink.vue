<template>
  <div class="d-inline">
    <v-btn :to="link" v-if="btn">
      <slot></slot>
    </v-btn>
    <router-link class="tag-link" :to="link" v-else>
      <div class="d-inline" v-if="useSlot">
        <slot></slot>
      </div>
      <div class="d-inline" v-else-if="big">
        <TagIcon :size="80" :tag="tag" />
        <div class="d-inline-block ml-2">
          <h1>#{{ tag }}</h1>
          <slot></slot>
        </div>
      </div>
      <div class="d-inline" v-else>
        <TagIcon :tag="tag" />
        <span class="ml-1">#{{ tag }}</span>
      </div>
    </router-link>
  </div>
</template>

<script>
import TagIcon from "@/components/TagIcon";

export default {
  name: "TagLink",
  components: {
    TagIcon
  },
  props: {
    useSlot: Boolean,
    btn: Boolean,
    tag: String,
    big: Boolean
  },
  computed: {
    hasSlot() {
      return !!this.$slots.default && !!this.$slots.default[0];
    },
    link() {
      return `/tag/${this.tag.toLowerCase()}`;
    }
  },
  data: () => ({
    //
  })
};
</script>

<style>
.tag-link {
  text-decoration: none;
}
</style>