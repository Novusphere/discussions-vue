<template>
  <v-card-actions :class="{ 'text-small': $vuetify.breakpoint.mobile  }">
    <v-btn :color="(post.myVote > 0) ? 'success' : ''" small icon @click="vote(1)">
      <v-icon>thumb_up</v-icon>
    </v-btn>
    <span>{{ post.getVoteScore() }}</span>
    <v-btn :color="(post.myVote < 0) ? 'error': ''" small icon @click="vote(-1)">
      <v-icon>thumb_down</v-icon>
    </v-btn>

    <v-btn text @click="sendTip()">
      <v-icon>attach_money</v-icon>Tip
    </v-btn>

    <PostThreadLink btn class="ml-2" :post="post" v-if="!isCommentDisplay">
      <v-icon>comment</v-icon>
      <span>{{ post.totalReplies }} Comments</span>
    </PostThreadLink>
    <v-btn text v-else @click="$emit('reply')">
      <v-icon>comment</v-icon>
      <span>Reply</span>
    </v-btn>

    <PostTips class="d-inline pl-3" :post="post" v-if="$vuetify.breakpoint.mobile" />

    <v-spacer></v-spacer>

    <v-menu offset-y>
      <template v-slot:activator="{ on, attrs }">
        <v-btn icon v-bind="attrs" v-on="on">
          <v-icon>more_vert</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-show="isLoggedIn && keys && (keys.arbitrary.pub == post.pub)">
          <v-btn text @click="$emit('edit')">Edit</v-btn>
        </v-list-item>
        <v-list-item v-show="isCommentDisplay">
          <PostThreadLink btn :post="post">Permalink</PostThreadLink>
        </v-list-item>
        <v-list-item>
          <v-btn text>Pin</v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text>Spam</v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn text>NSFW</v-btn>
        </v-list-item>
        <v-list-item>
          <TransactionLink btn :chain="post.chain" :transaction="post.transaction">On Chain</TransactionLink>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-card-actions>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { submitVote } from "@/novusphere-js/discussions/api";
import { sleep } from "@/novusphere-js/utility";

import PostThreadLink from "@/components/PostThreadLink";
import TransactionLink from "@/components/TransactionLink";
import PostTips from "@/components/PostTips";

export default {
  name: "PostCardActions",
  components: {
    //PublicKeyIcon
    PostThreadLink,
    TransactionLink,
    PostTips
  },
  props: {
    post: Object,
    isCommentDisplay: Boolean
  },
  computed: {
    ...mapGetters(['isLoggedIn']),
    ...mapState({
      keys: state => state.keys
    })
  },
  data: () => ({
    //
  }),
  methods: {
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
          uuid: this.post.uuid
        }
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
        uuid: this.post.uuid
      });

      console.log(`vote trxid: ${trxid}`);
    }
  }
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
