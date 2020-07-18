<template>
  <div class="d-inline-block tag-link">
    <v-menu
      max-width="400"
      v-if="popover"
      v-model="showPopover"
      :position-x="popoverX"
      :position-y="popoverY"
      :close-on-content-click="false"
    >
      <slot></slot>
    </v-menu>
    <v-btn :to="link" v-if="btn">
      <slot></slot>
    </v-btn>
    <a @click="clicked" v-else>
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
    </a>
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
    inline: Boolean,
    popover: { type: Boolean, default: false }
  },
  computed: {
    tagWidth() {
      if (this.$vuetify.breakpoint.lg) return "13ch";
      return "20ch";
    },
    link() {
      return `/tag/${this.tag.toLowerCase()}`;
    }
  },
  data: () => ({
    showPopover: false,
    popoverX: 0,
    popoverY: 0
  }),
  async created() {},
  methods: {
    async clicked(e) {
      e.stopPropagation();

      if (!this.popover) {
        this.$router.push(this.link);
        return;
      }

      this.$emit("show-popover");

      const rect = this.$el.getBoundingClientRect();
      this.popoverX = rect.x + rect.width + 10;
      this.popoverY = rect.y - 10;
      this.showPopover = true;
    }
  }
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