<template>
  <v-btn text :to="`/notifications`">
    <v-badge v-if="notificationCount > 0 && !chip" color="red" overlap>
      <template v-slot:badge>
        <span>{{ notificationCount }}</span>
      </template>
      <v-icon>notifications</v-icon>
    </v-badge>
    <span v-else>
      <v-icon>notifications</v-icon>
    </span>
    <div class="d-inline">
      <slot></slot>
      <v-chip
        class="ml-1"
        small
        dark
        color="red"
        v-if="notificationCount > 0 && chip"
      >{{ notificationCount }}</v-chip>
    </div>
  </v-btn>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { searchPostsByNotifications } from "@/novusphere-js/discussions/api";

export default {
  name: "NotificationsButton",
  components: {},
  props: {
    chip: Boolean
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      notificationCount: state => state.notificationCount,
      lastSeenNotificationsTime: state => state.lastSeenNotificationsTime,
      keys: state => state.keys,
      watchedPosts: state => [] || state // TO-DO
    })
  },
  data: () => ({
    stopChecking: false
  }),
  async created() {
    await this.checkNotifications();
  },
  async beforeDestroy() {
    this.stopChecking = true;
  },
  methods: {
    async checkNotifications() {
      if (this.stopChecking) return;
      if (this.isLoggedIn) {
        if (Notification && Notification.permission !== 'denied') {
            await Notification.requestPermission();
        }

        const cursor = searchPostsByNotifications(
          this.keys.arbitrary.pub,
          this.lastSeenNotificationsTime
        );
        cursor.includeOpeningPost = false; // dont need this
        cursor.pipeline.push({ $count: "n" });
        let n = 0;
        try {
          const raw = await cursor.nextRaw();
          //console.log(this.lastSeenNotificationsTime);
          //console.log(raw);
          n = raw[0].n;
        } catch (ex) {
          n = 0;
        }

        if (n > 0 && n != this.notificationCount) {
            if (Notification && Notification.permission == 'granted') {
                new Notification(`You have ${n} new notification${n > 1 ? 's' : ''} on Discussions`);
            }
        }

        this.$store.commit("setNotificationCount", n);
      }
      setTimeout(() => this.checkNotifications(), 5000);
    }
  }
};
</script>