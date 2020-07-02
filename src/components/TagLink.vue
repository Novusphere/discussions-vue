<template>
  <div class="d-inline-block tag-link">
    <v-btn :to="link" v-if="btn">
      <slot></slot>
    </v-btn>
    <router-link :to="link" v-else>
      <div class="d-inline" v-if="useSlot">
        <slot></slot>
      </div>
      <div v-else-if="big" class="tag-link-content">
        <TagIcon v-show="!noIcon" :size="80" :tag="tag" />
        <div class="d-inline-block ml-2">
          <h1>#{{ tag }}</h1>
          <slot></slot>
        </div>
      </div>
      <div
        v-else
        class="tag-link-content"
        :class="{ 'd-inline': inline }"
        :style="{'max-width': tagWidth }"
      >
        <TagIcon v-show="!noIcon" :tag="tag" />
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
    noIcon: Boolean,
    useSlot: Boolean,
    btn: Boolean,
    tag: String,
    big: Boolean,
    inline: Boolean
  },
  computed: {
    tagWidth() {
      if (this.$vuetify.breakpoint.lg) return '13ch';
      return '30ch';
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
.tag-link a {
  text-decoration: none;
}

.tag-link-content {
  text-overflow: ellipsis;

  /* Required for text-overflow to do anything */
  white-space: nowrap;
  overflow: hidden;
}
</style>