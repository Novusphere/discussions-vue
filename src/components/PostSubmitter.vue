<template>
  <div>
    <div v-if="isLoggedIn">
      <v-text-field
        v-if="titleField"
        v-model="title"
        label="Title"
        hint="Enter your post title (optional)"
        required
      ></v-text-field>
      <MarkdownEditor :mention-suggester="mentionSuggester" ref="editor" />
      <div class="mt-1 error--text text-center" v-show="submitError">{{ submitError }}</div>
      <div class="mt-1">
        <v-btn color="primary" @click="submitPost()" :disabled="disablePost">
          <v-progress-circular class="mr-2" indeterminate v-if="disablePost"></v-progress-circular>
          <span>{{ edit ? 'Edit' : 'Post' }}</span>
        </v-btn>
        <v-btn color="primary" class="ml-1" @click="cancel()" v-if="cancelable">Cancel</v-btn>
      </div>
    </div>
    <div v-else>
      <v-btn
        color="primary"
        block
        @click="$store.commit('setLoginDialogOpen', true)"
      >sign in to comment</v-btn>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import MarkdownEditor from "@/components/MarkdownEditor";
import { waitFor, sleep, generateUuid } from "@/novusphere-js/utility";
import {
  Post,
  getSinglePost,
  submitPost,
  getUserProfile
} from "@/novusphere-js/discussions/api";
import {
  createAsset,
  sumAsset,
  getChainForSymbol,
  getAmountFeeAssetsForTotal,
  brainKeyToKeys,
  decrypt
} from "@/novusphere-js/uid";

export default {
  name: "PostSubmitter",
  components: {
    MarkdownEditor
  },
  props: {
    sub: String,
    parentPost: Object,
    cancelable: Boolean,
    edit: Boolean,
    titleField: Boolean
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      displayName: state => state.displayName,
      keys: state => state.keys,
      isTransferDialogOpen: state => state.isTransferDialogOpen,
      encryptedBrainKey: state => state.encryptedBrainKey,
      encryptedTest: state => state.encryptedTest,
      tempPassword: state => state.tempPassword,
      followingUsers: state => state.followingUsers
    })
  },
  data: () => ({
    disablePost: false,
    title: "",
    submitError: ""
  }),
  async created() {},
  mounted() {},
  beforeDestroy() {},
  methods: {
    hasInput() {
      const editor = this.getEditor();
      if (!editor) return false;
      
      const html = editor.getHTML();
      return html.length >= 8;
    },
    getEditor() {
      return this.$refs.editor;
    },
    cancel() {
      this.getEditor().clear();
      this.$emit('cancel');
    },
    mentionSuggester(query) {
      // include people who the user is following
      let items = this.followingUsers.map(u => ({
        pub: u.pub,
        displayName: u.displayName
      }));

      // include people who have participated in current thread
      if (this.parentPost.threadTree) {
        for (const { post } of Object.values(this.parentPost.threadTree)) {
          if (items.find(i => i.pub == post.pub)) continue;
          items.push({ pub: post.pub, displayName: post.displayName });
        }
      }
      if (!query) {
        return items;
      }
      const regex = new RegExp(`^${query}`, "i");
      const filtered = items.filter(i => regex.test(i.displayName));
      return filtered;
    },
    setEditorContent(title, value) {
      if (this.titleField) {
        this.title = title;
      }
      this.getEditor().setFromMarkdown(value);
    },
    async submitPost() {
      if (!this.isLoggedIn) return;

      this.submitError = "";
      this.disablePost = true;
      await sleep(50); // allow disablePost to update

      const content = this.$refs.editor.getMarkdown();
      const tags = this.$refs.editor.getTags();
      const mentions = this.$refs.editor.getMentions().map(m => m.pub);
      const tips = this.$refs.editor.getTips();

      const uuid = generateUuid();
      const post = {
        title: this.title,
        displayName: this.displayName,
        content: content,
        uuid: uuid,
        threadUuid: this.parentPost ? this.parentPost.threadUuid : uuid,
        parentUuid: this.parentPost ? this.parentPost.uuid : "",
        tags: tags,
        mentions: mentions,
        uidw: this.keys.wallet.pub,
        sub: this.sub
          ? this.sub
          : this.parentPost
          ? this.parentPost.sub
          : tags.length > 0
          ? tags[0]
          : "all",
        edit: this.edit
      };

      //await sleep(5000);
      let trxid = undefined;
      try {
        if (!post.content || post.content.length < 5)
          throw new Error(`Content is too short`);

        let transferActions = [];
        if (tips.length > 0) {
          for (const { symbol, quantity, pub } of tips) {
            let uidw = undefined;
            let recipientName = undefined;

            if (pub) {
              // attempt to find [uidw] from the thread tree
              if (this.parentPost && this.parentPost.threadTree) {
                const attempt = Object.values(this.parentPost.threadTree)
                  .map(c => c.post)
                  .find(p => p.pub == pub);

                if (attempt) {
                  uidw = attempt.uidw;
                  recipientName = attempt.displayName;
                  console.log(
                    `Resolved user ${pub} to name=${recipientName}, uidw=${uidw} via thread tree`
                  );
                }
              }

              // attempt to find [uidw] from a persons following
              if (!uidw) {
                const attempt = this.followingUsers.find(u => u.pub == pub);
                if (attempt) {
                  uidw = attempt.uidw;
                  recipientName = attempt.displayName;
                  console.log(
                    `Resolved user ${pub} to name=${recipientName}, uidw=${uidw} via following`
                  );
                }
              }

              // as a last resort, resolve the uidw from the API
              if (!uidw) {
                const profile = await getUserProfile(pub);
                if (profile && profile.uidw) {
                  uidw = profile.uidw;
                  recipientName = profile.displayName;
                  console.log(
                    `Resolved user ${pub} to name=${recipientName}, uidw=${uidw} via user profile api`
                  );
                }
              }
            } else {
              uidw = this.parentPost.uidw;
              recipientName = this.parentPost.displayName;
            }

            if (!uidw || !recipientName || !symbol || !quantity) {
              throw new Error(
                `There was an unexpected error with the tip: ${JSON.stringify({
                  pub,
                  uidw,
                  recipientName,
                  symbol,
                  quantity
                })}`
              );
            }

            const { amountAsset, feeAsset } = await getAmountFeeAssetsForTotal(
              await createAsset(quantity, symbol)
            );

            transferActions.push({
              chain: await getChainForSymbol(symbol),
              senderPrivateKey: "",
              recipientPublicKey: uidw,
              amount: amountAsset,
              fee: feeAsset,
              nonce: Date.now(),
              memo: `tip`,
              // non-standard transfer action data (used in transfer dialog)
              recipient: {
                pub: pub || this.parentPost.pub, // their posting (arbitrary) key
                displayName: recipientName
              },
              symbol: symbol,
              total: await sumAsset(amountAsset, feeAsset)
            });
          }

          this.$store.commit("setTransferDialogOpen", {
            value: true,
            transfers: transferActions.map(ta => ({ ...ta })) // so that [transferActions] isnt observed
          });

          await waitFor(async () => !this.isTransferDialogOpen);

          // update transfer actions with the wallet key
          if (decrypt(this.encryptedTest, this.tempPassword) != "test")
            throw new Error(`Invalid password`);

          const tempPassword = this.tempPassword;
          this.$store.commit("setTempPassword", ""); // clear password

          const keys = await brainKeyToKeys(
            decrypt(this.encryptedBrainKey, tempPassword)
          );
          transferActions = transferActions.map(ta => ({
            ...ta,
            senderPrivateKey: keys.wallet.key
          }));

          await sleep(100); // let the transfer dialog close
        }

        //trxid =
        //  "30072ef2bf4c3b22bd417709fa4f14aabf2dfbabdd9a03a2a3a34e73bb038c31";

        trxid = await submitPost(
          this.keys.arbitrary.key,
          post,
          transferActions
        );
      } catch (ex) {
        this.disablePost = false;
        this.submitError = ex.toString();
        console.error(ex);
        return;
      }

      if (trxid && getSinglePost && submitPost) {
        let artificalReplyPost = new Post();
        artificalReplyPost.transaction = trxid;
        artificalReplyPost.title = post.title;
        artificalReplyPost.chain = "eos";
        artificalReplyPost.parentUuid = post.parentUuid;
        artificalReplyPost.threadUuid = post.threadUuid;
        artificalReplyPost.uuid = post.uuid;
        artificalReplyPost.displayName = post.displayName;
        artificalReplyPost.content = post.content;
        artificalReplyPost.createdAt = new Date();
        artificalReplyPost.sub = post.sub;
        artificalReplyPost.tags = post.tags;
        artificalReplyPost.pub = this.keys.arbitrary.pub;
        // sig?
        artificalReplyPost.uidw = post.uidw;
        artificalReplyPost.upvotes = 1;
        artificalReplyPost.myVote = 1;

        this.disablePost = false;
        this.getEditor().clear();

        if (this.edit) {
          console.log(`edit trxid: ${trxid}`);
          this.$emit("edit", artificalReplyPost);
        } else {
          console.log(`post trxid: ${trxid}`);
          this.$emit("reply", artificalReplyPost);
        }
      }
    }
  }
};
</script>
