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
      <v-tabs center-active show-arrows v-model="tab">
        <v-tab>Editor</v-tab>
        <v-tab>Preview</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item :transition="false" :reverse-transition="false">
          <MarkdownEditor class="mt-1" :mention-suggester="mentionSuggester" ref="editor" />
        </v-tab-item>
        <v-tab-item :transition="false" :reverse-transition="false">
          <div class="mt-1" v-if="preview">
            <PostCard v-if="preview" :post="preview" />
          </div>
        </v-tab-item>
      </v-tabs-items>
      <div class="mt-2 error--text text-center" v-show="submitError">{{ submitError }}</div>
      <div class="mt-2">
        <v-btn color="primary" @click="submitPost()" :disabled="disablePost">
          <v-progress-circular class="mr-2" indeterminate v-if="disablePost"></v-progress-circular>
          <span>Submit</span>
        </v-btn>
        <v-btn color="primary" class="ml-1" @click="cancel()" v-if="cancelable">Cancel</v-btn>
      </div>
      <div style="height: 5px"></div>
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
import PostCard from "@/components/PostCard";
import { waitFor, generateUuid } from "@/novusphere-js/utility";
import {
  Post,
  submitPost,
  getUserProfile,
} from "@/novusphere-js/discussions/api";
import {
  createAsset,
  sumAsset,
  getChainForSymbol,
  getAmountFeeAssetsForTotal,
  brainKeyToKeys,
  decrypt,
} from "@/novusphere-js/uid";

export default {
  name: "PostSubmitter",
  components: {
    MarkdownEditor,
    PostCard,
  },
  props: {
    draft: String,
    sub: String,
    parentPost: Object,
    cancelable: Boolean,
    edit: Boolean,
    titleField: Boolean,
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      drafts: (state) => state.drafts,
      displayName: (state) => state.displayName,
      keys: (state) => state.keys,
      isTransferDialogOpen: (state) => state.isTransferDialogOpen,
      encryptedBrainKey: (state) => state.encryptedBrainKey,
      encryptedTest: (state) => state.encryptedTest,
      tempPassword: (state) => state.tempPassword,
      followingUsers: (state) => state.followingUsers,
    }),
  },
  data: () => ({
    saveDraftInterval: null,
    preview: null,
    tab: 0,
    disablePost: false,
    title: "",
    submitError: "",
  }),
  watch: {
    async tab() {
      if (this.tab == 1) {
        const { artificalSubmission } = await this.generateSubmission();
        this.preview = artificalSubmission;
      }
    },
  },
  async created() {},
  mounted() {
    if (this.draft) {
      const html = this.drafts[this.draft];
      if (html) {
        //console.log(`restore draft`, html);
        const editor = this.getEditor();
        editor.setFromHtml(html);
      }
      this.saveDraftInterval = setInterval(() => this.saveDraft(), 1000);
    }
  },
  beforeDestroy() {
    if (this.saveDraftInterval) {
      clearInterval(this.saveDraftInterval);
    }
  },
  methods: {
    saveDraft() {
      const editor = this.getEditor();
      if (!editor) return;
      if (!this.draft) return;

      const html = editor.getHTML();
      if (html.length >= 8) {
        //console.log(this.draft, html);
        this.$store.commit("saveDraft", { draftType: this.draft, draft: html });
      }
    },
    clear() {
      const editor = this.getEditor();
      if (!editor) return;

      this.getEditor().clear();

      if (!this.draft) return;
      this.$store.commit("saveDraft", { draftType: this.draft, draft: "" });
    },
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
      this.preview = null;
      this.getEditor().clear();
      this.$emit("cancel");
    },
    mentionSuggester(query) {
      console.proxyLog(`mentionsSuggester: ${query}`);
      // include people who the user is following
      let items = this.followingUsers.map((u) => ({
        pub: u.pub,
        displayName: [u.displayName],
      }));

      // include people who have participated in current thread
      if (this.parentPost && this.parentPost.threadTree) {
        for (const { post } of Object.values(this.parentPost.threadTree)) {
          const existing = items.find((i) => i.pub == post.pub);
          if (existing) {
            if (!existing.displayName.some((dn) => dn == post.displayName)) {
              existing.displayName.push(post.displayName);
            }
          } else {
            items.push({ pub: post.pub, displayName: [post.displayName] });
          }
        }
      }

      console.proxyLog(`mentions pre-filter: ${JSON.stringify(items)}`);

      if (!query) {
        return items;
      }
      const regex = new RegExp(`^${query}`, "i");
      const filtered = items.filter((i) =>
        i.displayName.some((dn) => regex.test(dn))
      );

      console.proxyLog(`mentions after filter: ${JSON.stringify(filtered)}`);

      return filtered;
    },
    setEditorContent(title, value) {
      if (this.titleField) {
        this.title = title;
      }
      this.getEditor().setFromMarkdown(value);
    },
    async generateSubmission() {
      const content = this.$refs.editor.getMarkdown();
      const tags = this.$refs.editor.getTags();
      const mentions = this.$refs.editor.getMentions().map((m) => m.pub);

      if (this.parentPost) {
        // include the person we're replying to as a silent mention
        mentions.push(this.parentPost.pub);

        // keep original mentions
        if (this.edit) {
          mentions.push(...this.parentPost.mentions);
        }

        // always tag OP in blogs
        if (this.parentPost.sub == "blog") {
          const threadTree = this.parentPost.threadTree;
          if (threadTree) {
            const op = threadTree[this.parentPost.threadUuid];
            if (op) {
              mentions.push(op.post.pub);
            }
          }
        }
      }

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
        edit: this.edit,
      };

      let artificalSubmission = new Post();
      artificalSubmission.title = post.title;
      artificalSubmission.chain = "eos";
      artificalSubmission.parentUuid = post.parentUuid;
      artificalSubmission.threadUuid = post.threadUuid;
      artificalSubmission.uuid = post.uuid;
      artificalSubmission.displayName = post.displayName;
      artificalSubmission.content = post.content;
      artificalSubmission.createdAt = new Date();
      artificalSubmission.sub = post.sub;
      artificalSubmission.tags = post.tags;
      artificalSubmission.pub = this.keys.arbitrary.pub;
      // sig?
      artificalSubmission.uidw = post.uidw;
      artificalSubmission.upvotes = 1;
      artificalSubmission.myVote = 1;
      artificalSubmission.edit = false;
      if (this.edit) {
        artificalSubmission.editedAt = Date.now();
        artificalSubmission.edit = true;
      }
      if (this.parentPost) {
        artificalSubmission.op = this.parentPost.op;
        artificalSubmission.threadTree = this.parentPost.threadTree;
      }

      return { post, artificalSubmission };
    },
    async generateSubmissionTips() {
      let transferActions = [];
      const tips = this.edit ? [] : this.$refs.editor.getTips(); // can't tip in an edit
      if (tips.length > 0) {
        for (const { symbol, quantity, pub } of tips) {
          let uidw = undefined;
          let recipientName = undefined;

          if (pub) {
            // attempt to find [uidw] from the thread tree
            if (this.parentPost && this.parentPost.threadTree) {
              const attempt = Object.values(this.parentPost.threadTree)
                .map((c) => c.post)
                .find((p) => p.pub == pub);

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
              const attempt = this.followingUsers.find((u) => u.pub == pub);
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
                quantity,
              })}`
            );
          }

          const { amountAsset, feeAsset } = await getAmountFeeAssetsForTotal(
            await createAsset(quantity, symbol)
          );

          let memo = `tip from ${this.displayName} to ${recipientName}`;
          if (this.parentPost) {
            memo += ` for ${this.parentPost.getRelativeUrl(false)}`;
          }

          transferActions.push({
            chain: await getChainForSymbol(symbol),
            senderPrivateKey: "",
            recipientPublicKey: uidw,
            amount: amountAsset,
            fee: feeAsset,
            nonce: Date.now(),
            memo: memo,
            // non-standard transfer action data (used in transfer dialog)
            recipient: {
              pub: pub || this.parentPost.pub, // their posting (arbitrary) key
              displayName: recipientName,
            },
            symbol: symbol,
            total: await sumAsset(amountAsset, feeAsset),
          });
        }

        this.$store.commit("setTransferDialogOpen", {
          value: true,
          transfers: transferActions.map((ta) => ({ ...ta })), // so that [transferActions] isnt observed
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
        transferActions = transferActions.map((ta) => ({
          ...ta,
          senderPrivateKey: keys.wallet.key,
        }));
      }

      return transferActions;
    },
    async submitPost() {
      if (!this.isLoggedIn) return;

      this.submitError = "";
      this.disablePost = true;

      const { post, artificalSubmission } = await this.generateSubmission();

      //await sleep(5000);
      let trxid = undefined;
      let transferActions = [];
      try {
        if (!post.content || post.content.length < 5)
          throw new Error(`Content is too short`);

        transferActions = await this.generateSubmissionTips();

        //trxid =
        //  "30072ef2bf4c3b22bd417709fa4f14aabf2dfbabdd9a03a2a3a34e73bb038c31";

        //console.log(post);
        //this.clear();
        //if (!trxid) throw new Error(`stop`);

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

      // only trxid needs to be checked, the rest is to prevent the linter from complaining about stuff we might need to toggle back on
      if (trxid) {
        artificalSubmission.transaction = trxid;

        this.disablePost = false;
        this.clear();

        if (this.edit) {
          console.log(`edit trxid: ${trxid}`);
          this.$emit("submit-post", { post: artificalSubmission });
        } else {
          console.log(`post trxid: ${trxid}`);
          this.$emit("submit-post", {
            post: artificalSubmission,
            transferActions: transferActions.map((ta) => ({
              ...ta,
              senderPrivateKey: "",
            })),
          });
        }
      }
    },
  },
};
</script>
