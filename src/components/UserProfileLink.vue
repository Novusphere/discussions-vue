<template>
  <router-link class="user-link" :to="link">
    <div class="d-inline-block" v-if="big">
      <PublicKeyIcon :size="80" :publicKey="publicKey" />
      <div class="d-inline-block ml-2">
        <h1 class="d-inline">{{ displayName }}</h1>
        <slot></slot>
      </div>
    </div>
    <div class="d-inline-block" v-else>
      <PublicKeyIcon :publicKey="publicKey" />
      <span class="ml-1">{{ displayName }}</span>
    </div>
  </router-link>
</template>

<script>
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default {
  name: "UserProfileLink",
  components: {
      PublicKeyIcon,
  },
  props: {
    displayName: String,
    publicKey: String,
    big: Boolean
  },
  computed: {
    link() {
      return `/u/${this.displayName}-${this.publicKey}`;
    }
  },
  data: () => ({}),
  methods: {}
};
</script>