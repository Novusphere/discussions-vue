import { mapState, mapGetters } from "vuex";
import { followUser, unfollowUser, subscribeTag, unsubscribeTag, orientTag, searchPostsByNotifications } from "@/novusphere-js/discussions/api";

export const userActionsMixin = {
    computed: {
        ...mapGetters(["isLoggedIn"]),
        ...mapState({
            keys: (state) => state.keys,
            delegatedMods: (state) => state.delegatedMods,
            followingUsers: (state) => state.followingUsers,
            notificationCount: (state) => state.notificationCount,
            lastSeenNotificationsTime: (state) => state.lastSeenNotificationsTime,
            watchedThreads: (state) => state.watchedThreads,
            limitMentions: (state) => state.limitMentions
        })
    },
    methods: {
        searchPostsByNotifications(time) {
            let keyFilter = undefined;

            if (this.limitMentions) {
                keyFilter = [...this.followingUsers.map(u => u.pub), ...this.delegatedMods.map(u => u.pub)];
            }

            const cursor = searchPostsByNotifications(
                this.keys.arbitrary.pub,
                (time == undefined) ? this.lastSeenNotificationsTime : time,
                this.watchedThreads,
                keyFilter
            );

            return cursor;
        },
        openLoginDialog() {
            this.$store.commit('setLoginDialogOpen', true);
        },
        async followUser({ displayName, pub, uidw }) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            if (pub == this.keys.arbitrary.pub) return; // self follow disallowed
            if (this.followingUsers.find(u => u.pub == pub)) return;

            const nameTime = Date.now();
            this.$store.commit('followUser', {
                displayName, pub, uidw, nameTime,
                beforeSaveCallback: async () => await followUser(this.keys.identity.key, { displayName, pub, uidw, nameTime })
            });
        },
        async unfollowUser(pub) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            this.$store.commit('unfollowUser', {
                pub,
                beforeSaveCallback: async () => await unfollowUser(this.keys.identity.key, pub)
            });
        },
        async subscribeTag(tag) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            tag = tag.toLowerCase();
            this.$store.commit("subscribeTag", {
                tag,
                beforeSaveCallback: async () => await subscribeTag(this.keys.identity.key, tag)
            });
        },
        async unsubscribeTag(tag) {
            if (!this.isLoggedIn) return this.openLoginDialog();

            tag = tag.toLowerCase();
            this.$store.commit("unsubscribeTag", {
                tag,
                beforeSaveCallback: async () => await unsubscribeTag(this.keys.identity.key, tag)
            });
        },
        async orientTag(tag, up) {
            if (!this.isLoggedIn) return;

            tag = tag.toLowerCase();
            this.$store.commit("orientTag", {
                tag,
                up,
                beforeSaveCallback: async () => await orientTag(this.keys.identity.key, tag, up)
            });
        }
    }
}