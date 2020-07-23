<template>
  <v-card-actions :class="{ 'text-small': $vuetify.breakpoint.mobile  }">
    <v-btn :color="(post.myVote > 0) ? 'success' : ''" small icon @click="vote(1)">
      <v-icon>thumb_up</v-icon>
    </v-btn>
    <span>{{ post.getVoteScore() }}</span>
    <v-btn :color="(post.myVote < 0) ? 'error': ''" small icon @click="vote(-1)">
      <v-icon>thumb_down</v-icon>
    </v-btn>

    <v-btn v-if="!isLoggedIn || (myPublicKey != post.pub)" text @click="sendTip()">
      <v-icon>attach_money</v-icon>Tip
    </v-btn>

    <PostThreadLink btn class="ml-2" :post="post" v-if="!isCommentDisplay">
      <v-icon>comment</v-icon>
      <span>{{ post.totalReplies + ((!$vuetify.breakpoint.mobile) ? ' Comments' : '')}}</span>
    </PostThreadLink>
    <v-btn text v-else @click="$emit('reply')">
      <v-icon>comment</v-icon>
      <span>Reply</span>
    </v-btn>

    <v-spacer></v-spacer>

    <v-menu offset-y>
      <template v-slot:activator="{ on, attrs }">
        <v-btn icon v-bind="attrs" v-on="on">
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-show="isLoggedIn && (myPublicKey == post.pub) && !noEdit">
          <v-btn text @click="$emit('edit')">
            <v-icon>edit</v-icon>
            <span>Edit</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <PostThreadLink btn copy :post="post">
            <v-icon>link</v-icon>
            <span>copy link</span>
          </PostThreadLink>
        </v-list-item>
        <v-list-item v-show="(isLoggedIn) && (post.uuid == post.threadUuid)">
          <v-btn text @click="watchThread()">
            <v-icon>watch_later</v-icon>
            <span>{{ isThreadWatched(post.uuid) ? 'unwatch' : 'watch' }}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="markAsPinned()">
            <v-icon color="green">push_pin</v-icon>
            <span>{{ isMyPolicy('pinned') ? 'unpin' : 'pin'}}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="markAsSpam()">
            <v-icon color="error">error</v-icon>
            <span>{{ isMyPolicy('spam') ? 'not spam' : 'spam' }}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="markAsNSFW()">
            <v-chip class="mr-1" small color="orange" text-color="white">18+</v-chip>
            <span>{{ isMyPolicy('nsfw') ? 'sfw' : 'nsfw' }}</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <TransactionLink btn :chain="post.chain" :transaction="post.transaction">
            <v-icon>zoom_in</v-icon>On Chain
          </TransactionLink>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="share('twitter')">
            <v-icon>mdi-twitter</v-icon>
            <span>Share</span>
          </v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text @click="share('fb')">
            <v-icon>mdi-facebook</v-icon>
            <span>Share</span>
          </v-btn>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-card-actions>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import {
  submitVote,
  modPolicySetTags,
  getUserAuth,
} from "@/novusphere-js/discussions/api";
import { sleep } from "@/novusphere-js/utility";
import config from "@/server/site";

import PostThreadLink from "@/components/PostThreadLink";
import TransactionLink from "@/components/TransactionLink";

export default {
  name: "PostCardActions",
  components: {
    //PublicKeyIcon
    PostThreadLink,
    TransactionLink,
    //PostTips
  },
  props: {
    post: Object,
    noEdit: Boolean,
    isCommentDisplay: Boolean,
  },
  computed: {
    ...mapGetters(["isLoggedIn", "isThreadWatched"]),
    ...mapState({
      keys: (state) => state.keys,
      myPublicKey: (state) => (state.keys ? state.keys.arbitrary.pub : ""),
    }),
  },
  data: () => ({
    //
  }),
  methods: {
    async share(where) {
      let link = `/tag/${this.post.sub}`;
      if (this.post.op && this.post.transaction != this.post.op.transaction) {
        link += `/${this.post.op.getEncodedId()}/${this.post.op.getSnakeCaseTitle()}/${this.post.getEncodedId()}`;
      } else {
        link += `/${this.post.getEncodedId()}/${this.post.getSnakeCaseTitle()}`;
      }

      link = config.url + link;
      
      const tags = this.post.tags.filter((t) => !["all"].some((t2) => t2 == t));

      let url = undefined;
      let features = undefined;
      if (where == "twitter") {
        const { auth: authorAuth } = await getUserAuth(this.post.pub);
        const authorTwitter = authorAuth.find((a) => a.name == "twitter");

        const by = authorTwitter ? authorTwitter.username : '';
        const mentions = [];

        for (const mentionedPub of this.post.mentions) {
          const { auth } = await getUserAuth(mentionedPub);
          const twitter = auth.find((a) => a.name == "twitter");
          if (twitter) {
            console.log(`Found ${mentionedPub} -> @${twitter.username}`);
            mentions.push(twitter.username);
          }
        }

        let tweet = ``;
        if (this.post.title) tweet += this.post.title + " ";
        tweet += `${link} via @thenovusphere `;
        if (by) tweet += `by @${by} `;
        if (tags.length > 0) tweet += `${tags.map((t) => `#${t}`).join(" ")} `;
        if (mentions.length > 0)
          tweet += `${mentions.map((m) => `@${m}`).join(" ")} `;

        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          tweet
        )}`;
        features =
          "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,width=600,height=600";
      } else if (where == "fb") {
        url =
          `https://www.facebook.com/sharer/sharer.php?u=${link}` +
          `&t=${tags.join(", ")}`;
        features =
          "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600";
      }

      if (url) {
        window.open(url, "", features);
      }
    },
    isMyPolicy(tag) {
      let pol = this.post.getMyModPolicy(this.myPublicKey);
      return pol.find((t) => t == tag);
    },
    async adjustModPolicy(tag) {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }

      let pol = this.post.getMyModPolicy(this.myPublicKey);

      if (pol.find((t) => t == tag)) pol = pol.filter((t) => t != tag);
      else pol.push(tag);

      this.post.setMyModPolicy(this.myPublicKey, pol);

      await modPolicySetTags(this.keys.arbitrary.key, this.post.uuid, pol);
    },
    async watchThread() {
      if (!this.isLoggedIn) return;
      if (this.isThreadWatched(this.post.uuid)) {
        this.$store.commit("unwatchThread", this.post.uuid);
      } else {
        this.$store.commit("watchThread", {
          uuid: this.post.uuid,
          transaction: this.post.transaction,
        });
      }
    },
    async markAsSpam() {
      await this.adjustModPolicy("spam");
    },
    async markAsNSFW() {
      await this.adjustModPolicy("nsfw");
    },
    async markAsPinned() {
      await this.adjustModPolicy("pinned");
    },
    async sendTip() {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }
      this.$store.commit("setSendTipDialogOpen", {
        value: true,
        recipient: {
          pub: this.post.pub,
          uidw: this.post.uidw,
          displayName: this.post.displayName,
          uuid: this.post.uuid,
          callback: ({ transaction, transferActions }) =>
            this.$emit("tip", {
              uuid: this.post.uuid,
              transaction,
              transferActions,
            }),
        },
      });
    },
    async vote(value) {
      if (!this.isLoggedIn) {
        this.$store.commit("setLoginDialogOpen", true);
        return;
      }
      if (this.post.myVote == value) return;

      if (this.post.myVote != 0) {
        if (this.post.myVote == 1) this.post.upvotes -= 1;
        else if (this.post.myVote == -1) this.post.downvotes -= 1;
      }

      if (value != 0) {
        if (value == 1) this.post.upvotes += 1;
        else if (value == -1) this.post.downvotes += 1;
      }

      this.post.myVote = value;

      // we make the assumption from here that the vote succeeds
      await sleep(500);
      const trxid = await submitVote(this.keys.arbitrary.key, {
        value: value,
        uuid: this.post.uuid,
      });

      console.log(`vote trxid: ${trxid}`);
    },
  },
};
</script>

<style lang="scss">
.text-small {
  font-size: 12px;

  .v-avatar {
    min-width: 16px !important;
    height: 16px !important;
    width: 16px !important;
  }
}
</style>
