<template>
  <div class="d-inline">
    <v-btn text v-if="btn" @click="copy ? copyLink() : goToLink()">
      <slot></slot>
    </v-btn>
    <a class="text-decoration-none" :href="this.link" @click.prevent="goToLink" v-else>
      <slot></slot>
    </a>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { threadLinkMixin } from "@/mixins/threadLink";
import { safariMixin } from "@/mixins/safari";

export default {
  name: "PostThreadLink",
  mixins: [threadLinkMixin, safariMixin],
  components: {},
  props: {
    btn: Boolean,
    copy: Boolean,
    post: Object,
  },
  computed: {
    ...mapState({
      alwaysUseThreadDialog: (state) => state.alwaysUseThreadDialog,
      isThreadDialogOpen: (state) => state.isThreadDialogOpen,
    }),
  },
  data: () => ({}),
  methods: {
    copyLink() {
      this.$copyText(`${window.location.origin}${this.link}`);
    },
    async goToLink() {  
      if (this.isThreadDialogOpen) {
        window.history.pushState({}, null, this.link);
      } else {
        if (
          this.alwaysUseThreadDialog ||
          (this.$vuetify.breakpoint.mobile && !this.isSafari)
        ) {
          this.openThreadDialog(this.post);
        } else {
          this.$router.push(this.link);
        }
      }
    },
  },
};
</script>