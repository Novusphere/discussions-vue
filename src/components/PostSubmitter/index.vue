<template>
  <div>
    <div v-if="isLoggedIn">
      <TagIcon v-if="false" />

      <v-text-field
        v-if="titleField"
        v-model="title"
        label="Title"
        hint="Enter your post title (optional)"
        required
      ></v-text-field>

      <v-select
        v-if="subSelect"
        :value="sub"
        :items="communityTags"
        @input="(s) => $emit('sub-change', s)"
      >
        <template v-slot:selection="{ item }">
          <span>#{{ item }}</span>
        </template>
        <template v-slot:prepend>
          <TagIcon :tag="sub" />
        </template>
        <template v-slot:item="{ item }">
          <TagIcon :tag="item" />
          <span class="ml-2">#{{ item }}</span>
        </template>
      </v-select>

      <v-tabs center-active show-arrows v-model="tab">
        <v-tab>Editor</v-tab>
        <v-tab>Preview</v-tab>
        <v-tab v-show="draft">Drafts</v-tab>
      </v-tabs>
      <v-tabs-items v-model="tab">
        <v-tab-item :transition="false" :reverse-transition="false">
          <MarkdownEditor
            class="mt-1"
            :mention-suggester="mentionSuggester"
            ref="editor"
            @change="$forceUpdate()"
          />
        </v-tab-item>
        <v-tab-item :transition="false" :reverse-transition="false">
          <div class="mt-1" v-if="preview">
            <PostCard v-if="preview" :post="preview" />
          </div>
        </v-tab-item>
        <v-tab-item :transition="false" :reverse-transition="false">
          <v-progress-linear class="mt-2" v-if="!drafts" indeterminate></v-progress-linear>
          <v-list v-if="drafts">
            <v-list-item v-for="(draft, i) in drafts" :key="i">
              <v-list-item-content>
                <v-list-item-title>
                  <v-btn
                    text
                    @click="selectDraft(i)"
                  >{{ draft.title ? draft.title : `Draft #${i+1} saved at ${new Date(draft.savedAt).toLocaleTimeString()}` }}</v-btn>
                  <v-btn icon @click="deleteDraft(i)">
                    <v-icon>delete</v-icon>
                  </v-btn>
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-tab-item>
      </v-tabs-items>
      <div class="mt-2 error--text text-center" v-show="submitError">{{ submitError }}</div>
      <div class="mt-2 success--text text-center" v-show="submitPrompt">{{ submitPrompt }}</div>
      <div class="mt-2" v-show="tab < 2">
        <v-btn color="primary" small dense @click="submitPost()" :disabled="disablePost">
          <v-progress-circular class="mr-2" indeterminate v-if="disablePost"></v-progress-circular>
          <span>Submit</span>
        </v-btn>
        <v-btn color="primary" small dense class="ml-1" @click="cancel()" v-if="cancelable">Cancel</v-btn>
        <v-btn
          color="primary"
          small
          dense
          absolute
          right
          :outlined="!hasUnsavedInput()"
          @click="saveDraft()"
          v-if="draft"
        >
          <v-progress-circular class="mr-2" indeterminate v-show="savingDrafts"></v-progress-circular>
          <span v-show="!savingDrafts || !$vuetify.breakpoint.mobile">Save Draft</span>
        </v-btn>
      </div>
      <div style="height: 5px"></div>
      <PayWall ref="paywall" v-if="showPaywall" />
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
import PayWall from "./PayWall";
import MarkdownEditor from "@/components/MarkdownEditor";
import TagIcon from "@/components/TagIcon";
import PostCard from "@/components/PostCard";
import { waitFor, generateUuid } from "@/novusphere-js/utility";
import {
  Post,
  submitPost,
  getUserProfile,
  getUserDrafts,
  saveUserDrafts,
  getCommunities,
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
    PayWall,
    TagIcon,
  },
  props: {
    showPaywall: Boolean,
    subSelect: Boolean,
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
      localDrafts: (state) => state.localDrafts,
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
    communityTags: [],
    workerInterval: null,
    currentDraftIndex: -1,
    savingDrafts: false,
    drafts: null,
    preview: null,
    tab: 0,
    disablePost: false,
    title: "",
    submitError: "",
    submitPrompt: "",
  }),
  watch: {
    async tab() {
      if (this.tab == 1) {
        const { artificalSubmission } = await this.generateSubmission();
        this.preview = artificalSubmission;
      } else if (this.tab == 2) {
        await this.loadDrafts();
      }
    },
  },
  async created() {},
  async mounted() {
    this.communityTags = ["all", "blog", ...(await getCommunities()).map((c) => c.tag)];

    if (this.draft) {
      const html = this.localDrafts[this.draft];
      if (html) {
        //console.log(`restore draft`, html);
        const editor = this.getEditor();
        editor.setFromHtml(html);
      }
    }

    this.workerInterval = setInterval(() => {
      if (this.draft) this.saveLocalDraft();
    }, 1000);
  },
  beforeDestroy() {
    clearInterval(this.workerInterval);
  },
  methods: {
    saveLocalDraft() {
      const editor = this.getEditor();
      if (!editor) return;
      if (!this.draft) return;
      const html = editor.getHTML();
      if (html.length >= 8) {
        //console.log(this.draft, html);
        this.$store.commit("saveLocalDraft", {
          draftType: this.draft,
          draft: html,
        });
      }
    },
    selectDraft(index) {
      this.currentDraftIndex = index;
      const { content, title } = this.drafts[index];
      this.title = title;
      this.getEditor().setFromHtml(content);
      this.tab = 0;
    },
    async loadDrafts() {
      if (this.drafts) return;
      const drafts = await getUserDrafts(this.keys.identity.key);
      //console.log(drafts);

      this.drafts = drafts;
    },
    async deleteDraft(index) {
      let drafts = this.drafts;

      try {
        this.submitError = "";
        this.submitPrompt = "";
        this.savingDrafts = true;
        this.drafts = null; // show the loader

        drafts.splice(index, 1);
        await saveUserDrafts(this.keys.identity.key, drafts);

        if (this.currentDraftIndex == index) {
          this.currentDraftIndex = -1;
        } else if (this.currentDraftIndex > index) {
          this.currentDraftIndex = this.currentDraftIndex - 1; // shift down
        }

        this.savingDrafts = false;
        this.drafts = drafts;
      } catch (ex) {
        this.submitError = ex.message;
        this.savingDrafts = false;
        this.drafts = drafts;
      }
    },
    async saveDraft() {
      try {
        this.submitError = "";
        this.submitPrompt = "";
        this.savingDrafts = true;

        if (!this.draft) return;

        const editor = this.getEditor();
        if (!editor) return;

        const html = editor.getHTML();
        if (html.length >= 8) {
          await this.loadDrafts();

          // limit the amount of drafts...
          if (this.drafts.length == 5 && this.currentDraftIndex == -1) {
            throw new Error(
              "You have too many saved drafts to create a new one."
            );
          }

          let drafts = [...this.drafts];
          let draftIndex = this.currentDraftIndex;
          const newDraft = {
            savedAt: Date.now(),
            title: this.title,
            content: html,
          };

          if (draftIndex == -1) {
            drafts.push(newDraft);
            draftIndex = drafts.length - 1;
          } else {
            drafts[draftIndex] = newDraft;
          }

          //console.log(`saving drafts...`);

          await saveUserDrafts(this.keys.identity.key, drafts);

          this.drafts = drafts;
          this.currentDraftIndex = draftIndex;
          this.savingDrafts = false;
          this.submitPrompt = `Draft saved at ${new Date().toLocaleTimeString()}`;
        }
      } catch (ex) {
        this.submitError = ex.message;
        this.savingDrafts = false;
      }
    },
    clear() {
      const editor = this.getEditor();
      if (!editor) return;

      this.getEditor().clear();

      if (!this.draft) return;
      this.$store.commit("saveLocalDraft", {
        draftType: this.draft,
        draft: "",
      });
    },
    hasUnsavedInput() {
      const editor = this.getEditor();
      if (!editor) return false;

      const html = editor.getHTML();
      if (html.length >= 8) {
        if (this.currentDraftIndex == -1) return true;
        if (this.drafts) {
          //console.log(this.currentDraftIndex);
          // compare the current draft versus current content
          const { content, title } = this.drafts[this.currentDraftIndex];
          if (content != html || title != this.title) {
            return true;
          }
        }
      }
      return false;
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
      //console.proxyLog(`mentionsSuggester: ${query}`);

      // include people who the user is following
      let items = this.followingUsers.map((u) => ({
        pub: u.pub,
        displayName: [u.displayName],
      }));

      // include people who have participated in current thread
      if (this.parentPost && this.parentPost.threadTree) {
        for (const { post } of Object.values(this.parentPost.threadTree)) {
          if (!post) continue;
          if (!post.pub) continue; // "real thread tree" field

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

      //console.proxyLog(`mentions pre-filter: ${JSON.stringify(items)}`);

      if (!query) {
        return items;
      }
      const regex = new RegExp(`^${query}`, "i");
      const filtered = items.filter((i) =>
        i.displayName.some((dn) => regex.test(dn))
      );

      //console.proxyLog(`mentions after filter: ${JSON.stringify(filtered)}`);

      return filtered;
    },
    setEditorContent(title, value) {
      if (this.titleField) {
        this.title = title;
      }
      this.getEditor().setFromMarkdown(value);
    },
    async generateSubmission() {
      const paywall = this.$refs.paywall ? this.$refs.paywall.value : undefined;

      if (paywall && paywall.$error) {
        throw new Error(paywall.$error);
      }

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
        paywall: paywall,
      };

      let artificalSubmission = new Post();
      artificalSubmission.paywall = paywall;
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

      //if (artificalSubmission) throw new Error(`stop`);

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
      this.submitPrompt = "";
      this.disablePost = true;

      let { post, artificalSubmission } = {};

      //await sleep(5000);
      let trxid = undefined;
      let transferActions = [];
      try {
        ({ post, artificalSubmission } = await this.generateSubmission());

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
