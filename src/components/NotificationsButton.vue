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
import { searchTransactions } from "@/novusphere-js/uid";

export default {
  name: "NotificationsButton",
  components: {},
  props: {
    chip: Boolean,
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      notificationCount: (state) => state.notificationCount,
      lastSeenNotificationsTime: (state) => state.lastSeenNotificationsTime,
      keys: (state) => state.keys,
      watchedThreads: (state) => state.watchedThreads,
    }),
  },
  data: () => ({
    stopChecking: false,
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
        if (Notification && Notification.permission !== "granted") {
          await Notification.requestPermission();
        }

        const cursor = searchPostsByNotifications(
          this.keys.arbitrary.pub,
          this.lastSeenNotificationsTime,
          this.watchedThreads
        );
        cursor.includeOpeningPost = false; // dont need this
        cursor.pipeline.push({ $count: "n" });

        const cursor2 = searchTransactions(this.keys.wallet.pub, "received");
        cursor2.pipeline[0].$match["time"] = { $gt: this.lastSeenNotificationsTime };
        cursor2.pipeline.push({ $count: "n" });

        let n = 0;
        try {
          const raw = await cursor.nextRaw();
          n += raw.length > 0 ? raw[0].n : 0;

          const raw2 = await cursor2.nextRaw();
          n += raw2.length > 0 ? raw2[0].n : 0;

          if (n > 0 && n != this.notificationCount) {
            if (Notification && Notification.permission == "granted") {
              new Notification(
                `You have ${n} new notification${
                  n > 1 ? "s" : ""
                } on Discussions`
              );
            }
          }

          this.$store.commit("setNotificationCount", n);
        } catch (ex) {
          n = 0;
          console.log(ex);
        }
      }
      setTimeout(() => this.checkNotifications(), 5000);
    },
  },
};
</script>