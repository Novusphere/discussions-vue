<template>
  <div>
    <v-btn text v-if="btn" :to="link">
      <PublicKeyIcon v-show="!noIcon" :publicKey="publicKey" />
      <span>{{ displayName }}</span>
    </v-btn>
    <router-link v-else class="user-link" :to="link">
      <div class="d-inline-block" v-if="big">
        <PublicKeyIcon v-show="!noIcon" :size="80" :publicKey="publicKey" />
        <div class="d-inline-block ml-2">
          <h1 class="d-inline">{{ displayName }}</h1>
          <slot></slot>
        </div>
      </div>
      <div class="d-inline-block" v-else>
        <PublicKeyIcon v-show="!noIcon" :publicKey="publicKey" />
        <span class="ml-1">{{ displayName }}</span>
      </div>
    </router-link>
  </div>
</template>

<script>
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default {
  name: "UserProfileLink",
  components: {
    PublicKeyIcon
  },
  props: {
    noIcon: Boolean,
    displayName: String,
    publicKey: String,
    big: Boolean,
    btn: Boolean
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