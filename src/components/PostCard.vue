<template>
  <v-card v-if="!post.isSpam || !hideSpam" :class="`post-card post-card-${this.post.transaction}`">
    <v-row no-gutters class="overline">
      <div class="pl-3 mt-1">
        <div class="d-inline-block pr-3" v-if="!$vuetify.breakpoint.mobile || post.threadTree">
          <v-btn icon @click="expanded = expanded ? 0 : -1">
            <v-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</v-icon>
          </v-btn>
        </div>
        <div class="d-inline">
          <div
            class="d-inline-block pr-3"
            v-if="(!$vuetify.breakpoint.mobile && !post.threadTree) || (isCommentDisplay && isThread) || (isBrowsing && isMultiTag)"
          >
            <TagLink inline popover :tag="post.sub" />
          </div>
          <div class="d-inline-block pr-3">
            <UserProfileLink
              popover
              :class="{'moderator': isModerator(post.sub, post.pub)}"
              :displayName="post.displayName"
              :publicKey="post.pub"
            />
          </div>
        </div>
        <div class="d-inline-block pr-3">
          <PostThreadLink :post="post">
            <span v-show="!post.edit">{{ shortTime(post.createdAt) }}</span>
            <span v-show="post.edit">
              <v-icon dense small>edit</v-icon>
              {{ shortTime(post.editedAt) }}
            </span>
          </PostThreadLink>
        </div>
        <div class="d-inline-block pr-3" v-if="post.isPinned || post.isSpam || post.isNSFW">
          <v-icon v-if="post.isPinned" color="success">push_pin</v-icon>
          <v-icon v-if="post.isSpam" color="error">error</v-icon>
          <v-chip v-if="post.isNSFW" small color="orange" text-color="white">18+</v-chip>
        </div>
        <div class="d-inline-block pr-3">
          <PostTips class="d-inline" :post="post" />
        </div>
      </div>
    </v-row>

    <div v-show="!editing">
      <div v-if="post.isSpam && !forceReveal">
        <v-row>
          <v-col :cols="12" align="center" justify="center">
            <v-btn color="error" @click="forceReveal = true, expanded = 0">Reveal Spam?</v-btn>
          </v-col>
        </v-row>
      </div>
      <div v-else>
        <v-row class="headline" v-if="isThread && post.title">
          <v-col cols="12">
            <div class="pl-3 pr-3">
              <PostThreadLink :post="post">{{ post.title }}</PostThreadLink>
            </div>
          </v-col>
        </v-row>

        <v-expansion-panels class="mt-2" flat tile :value="expanded">
          <v-expansion-panel>
            <v-expansion-panel-content>
              <v-card flat :color="contentBackgroundColor" v-if="isPaidLockContent">
                <div class="text-center">
                  <p v-if="!isPaidLockForever">
                    Content available for free in
                    <Countdown :end="post.paywall.expire" @done="paywallExpire()" />
                  </p>
                  <v-btn
                    color="primary"
                    outlined
                    @click="payForContent()"
                  >Unlock for {{ post.paywall.asset }}</v-btn>
                </div>
              </v-card>
              <v-card flat @click.native="cardClicked" :color="contentBackgroundColor" v-else>
                <div
                  :class="{ 
                    'dark-fade': $vuetify.theme.dark,
                    'content-fade': isPreviewDisplay && !isCompactContent, 
                    'nsfw-blur': post.isNSFW && blurNSFW && !removeNSFWOverlay }"
                >
                  <div class="post-html" v-html="postHTML"></div>
                </div>
              </v-card>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>
    <div v-show="editing" v-if="post.transaction">
      <v-card-text>
        <slot name="editor"></slot>
      </v-card-text>
    </div>

    <slot name="actions" :tip="tip"></slot>

    <div class="post-replies ml-1">
      <slot name="replies"></slot>
    </div>
  </v-card>
</template>

<script>
import loadTelegram from "../assets/telegram";

import { mapState, mapGetters } from "vuex";

import { userActionsMixin } from "@/mixins/userActions";

import {
  getCommunityByTag,
  getUserProfile,
} from "@/novusphere-js/discussions/api";
import { createArtificalTips, isValidAsset } from "@/novusphere-js/uid";
import { sleep } from "@/novusphere-js/utility";

import { shortTimeMixin } from "@/mixins/shortTime";

import UserProfileLink from "@/components/UserProfileLink";
import TagLink from "@/components/TagLink";
import PostTips from "@/components/PostTips";
import PostThreadLink from "@/components/PostThreadLink";

import Countdown from "@/components/Countdown";

function hookRelativeAnchors($vue, document) {
  if (!$vue) return;

  const relativeAnchors = Array.from(
    document.querySelectorAll(`a:not([class])`)
  )
    .map((a) => ({ a, href: a.getAttribute("href") }))
    .filter(
      ({ href }) =>
        href &&
        (href.indexOf("/") == 0 || href.indexOf("discussions.app/") > -1)
    );

  relativeAnchors.forEach(async ({ a, href }) => {
    if (a.getAttribute("target")) return;

    // turn into relative
    if (href.indexOf("/") != 0) {
      href = href.substring(href.indexOf("/", href.indexOf("//") + 2));
      a.setAttribute("href", href);
    }

    a.setAttribute("class", "_");
    a.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (href.indexOf("/u/") == 0) {
        const user = href.split("/").filter((s) => s)[1];

        if (user) {
          let [displayName, publicKey] = user.split("-");
          const info = await getUserProfile(publicKey);
          const rect = this.getBoundingClientRect();

          return $vue.$store.commit("setPopoverOpen", {
            value: true,
            type: "profile",
            rect,
            uidw: info.uidw,
            displayName: displayName,
            publicKey: publicKey,
            profileInfo: info,
          });
        }
      } else if (href.indexOf("/tag/") == 0) {
        const [, tagGroup, threadRefId, title, threadRefId2] = href
          .split("/")
          .filter((s) => s);
        if (!threadRefId) {
          const tags = tagGroup.split(",");
          if (tags.length == 1) {
            const rect = this.getBoundingClientRect();
            const community = await getCommunityByTag(tags[0]);

            await sleep(100); // incase there's another popover open

            return $vue.$store.commit("setPopoverOpen", {
              value: true,
              type: "tag",
              rect,
              community,
            });
          }
        } else {
          const {
            isThreadDialogOpen,
            alwaysUseThreadDialog,
          } = $vue.$store.state;
          if (isThreadDialogOpen || alwaysUseThreadDialog) {
            return $vue.$store.commit("setThreadDialogOpen", {
              value: true,
              sub: tagGroup,
              referenceId: threadRefId,
              title: title,
              referenceId2: threadRefId2,
            });
          }
        }
      }

      return $vue.$router.push(href);
    });
  });
}

function hookPostImages($vue, document) {
  if (!$vue) return;

  const postImages = Array.from(document.querySelectorAll(".post-html img"));

  for (const img of postImages) {
    img.onclick = function (e) {
      const srcs = Array.from(img.closest(".post-html").querySelectorAll("img"))
        .map((img) => img.getAttribute("src"))
        .filter((s) => s);

      if (srcs.length > 0) {
        $vue.$store.commit("setImageViewer", srcs);
      }

      return e.stopPropagation();
    };
  }
}

// kind of hacky, but... such is life
const _oembedMaxAttempt = 10;
let _oembedAttempts = _oembedMaxAttempt;
let _oembedNextAttempt = 0;
(async function _refreshOEmbed() {
  for (;;) {
    const now = Date.now();
    if (_oembedAttempts < _oembedMaxAttempt && now >= _oembedNextAttempt) {
      _oembedNextAttempt = now + 1000;
      _oembedAttempts++;

      if (window.FB) {
        //window.FB.XFBML.parse();
      }

      if (window.twttr) {
        window.twttr.widgets.load();
      }

      if (window.instgrm) {
        window.instgrm.Embeds.process();
      }

      loadTelegram(window);
      hookRelativeAnchors(window.$vue, document);
      hookPostImages(window.$vue, document);
    }
    await sleep(100);
  }
})();

function refreshOEmbed() {
  _oembedAttempts = 0; // reset
  _oembedNextAttempt = 0; // schedule immediately
}

export default {
  name: "PostCard",
  mixins: [shortTimeMixin, userActionsMixin],
  components: {
    UserProfileLink,
    TagLink,
    //TagIcon,
    //PublicKeyIcon,
    //PostCardActions,
    PostTips,
    PostThreadLink,
    //CommunityCard,
    //PostSubmitter,
    Countdown,
  },
  props: {
    clickable: Boolean,
    post: Object,
    comments: Array,
    display: String,
    editing: Boolean,
  },
  computed: {
    contentBackgroundColor() {
      if (
        this.$route.params.referenceId2 &&
        this.post.equalsReferenceId(this.$route.params.referenceId2)
      ) {
        if (this.$vuetify.theme.dark) {
          return "#585858";
        } else {
          return "#ffc";
        }
      }
      return undefined;
    },
    shouldShowPostHTML() {
      return true;
    },
    isThread() {
      return this.post.uuid == this.post.threadUuid;
    },
    isCompactContent() {
      return this.post.content.length <= 300;
    },
    isCommentDisplay() {
      return this.display == "comment";
    },
    isCompactDisplay() {
      return this.display == "compact";
    },
    isPreviewDisplay() {
      return this.display == "preview";
    },
    isFullDisplay() {
      return this.display == "full";
    },
    isMultiTag() {
      if (!this.isBrowsing) return false;
      if (!this.$route.params.tags) return true; // assume we're on a multi tag
      const tags = this.$route.params.tags.split(",");
      return tags.length > 1 || (tags.length == 1 && tags[0] == "all");
    },
    isBrowsing() {
      // one of the browsing display modes
      return (
        this.isCompactDisplay || this.isPreviewDisplay || this.isFullDisplay
      );
    },
    isPaidLockForever() {
      const paywall = this.post.paywall;

      if (!paywall) return false;
      if (paywall.expire.getTime() != 0) return false;

      return true;
    },
    isPaidLockContent() {
      const paywall = this.post.paywall;

      if (!paywall) return false;

      if (this.isLoggedIn && this.post.pub == this.keys.arbitrary.pub)
        return false; // this is our own post

      const expire = paywall.expire.getTime();
      const now = Date.now();

      if (expire != 0 && (expire - now) <= 0) return false;
      if (!isValidAsset(paywall.asset)) return false; 

      let [amount, symbol] = paywall.asset.split(" ");
      amount = parseFloat(amount);

      for (const tip of this.post.tips) {
        if (!this.isLoggedIn || tip.data.from != this.keys.wallet.pub) continue; // it's not us who paid for it
        const [amount2, symbol2] = tip.data.amount.split(" ");
        if (symbol2 != symbol) continue;
        amount -= parseFloat(amount2) + parseFloat(tip.data.fee);
        if (amount <= 0) {
          // we've paid enough for it
          return false;
        }
      }

      return true;
    },
    ...mapGetters(["isModerator", "isLoggedIn"]),
    ...mapState({
      hideSpam: (state) => state.hideSpam,
      blurNSFW: (state) => state.blurNSFW,
      keys: (state) => state.keys,
    }),
  },
  watch: {
    "post.content": async function () {
      this.postHTML = await this.post.getContentHTML();
    },
    isCompactDisplay() {
      if (this.isCompactDisplay) this.expanded = -1;
      else this.expanded = 0;
    },
  },
  data: () => ({
    community: null,
    expanded: 0, // 0 is show, -1 is don't show
    postHTML: "",
    forceReveal: false,
    removeNSFWOverlay: false,
  }),
  async mounted() {
    if (this.isCompactDisplay) this.expanded = -1;
    else this.expanded = 0;

    this.postHTML = await this.post.getContentHTML();

    refreshOEmbed();
  },
  methods: {
    paywallExpire() {
      this.post.paywall = undefined;
    },
    payForContent() {
      if (!this.isLoggedIn) return this.openLoginDialog();

      const recipients = [
        {
          $asset: this.post.paywall.asset,
          pub: this.post.pub,
          uidw: this.post.uidw,
          displayName: this.post.displayName,
          memo: `pay for content ${this.post.getRelativeUrl(false)}`,
          uuid: this.post.uuid,
          callback: ({ transaction, transferActions }) =>
            this.tip({ uuid: this.post.uuid, transaction, transferActions }),
        },
      ];

      this.$store.commit("setSendTipDialogOpen", {
        value: true,
        recipients: recipients,
      });
    },
    async tip({ uuid, transaction, transferActions }) {
      let post = this.post;

      if (uuid != post.uuid) {
        if (!post.threadTree) return;
        const reply = post.threadTree[uuid];
        if (!reply) return;
        post = reply.post;
      }

      const filteredTransferActions = transferActions.filter(
        (ta) => ta.recipientPublicKey == post.uidw
      );

      if (filteredTransferActions.length == 0) return;

      let artificalTips = await createArtificalTips(
        this.keys.wallet.pub,
        transaction,
        filteredTransferActions
      );
      post.tips.push(...artificalTips);
    },
    submitPost({ post, transferActions }) {
      this.$emit("submit-post", { post, transferActions });
    },
    cardClicked(event) {
      // reveal the blur if clicked on
      if (this.post.isNSFW && !this.removeNSFWOverlay) {
        this.removeNSFWOverlay = true;
        event.preventDefault();
        return;
      }

      // other...
      if (!this.clickable) return;

      event.preventDefault();

      let referenceId = undefined;
      let referenceId2 = undefined;
      let sub = undefined;
      let title = undefined;
      if (this.post.op) {
        sub = this.post.op.sub;
        title = this.post.op.getSnakeCaseTitle();
        referenceId = this.post.op.getEncodedId();
        referenceId2 = this.post.getEncodedId();
      } else {
        sub = this.post.sub;
        title = this.post.getSnakeCaseTitle();
        referenceId = this.post.getEncodedId();
      }

      this.$store.commit("setThreadDialogOpen", {
        value: true,
        sub,
        referenceId,
        title,
        referenceId2,
      });
    },
  },
};
</script>

<style lang="scss">
.post-card {
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);

  .moderator .user-link {
    color: red;
  }

  .post-html {
    img,
    iframe,
    video {
      min-width: 0px !important; /* instagram override */
      max-width: min(100%, 512px) !important;
      display: block;
      padding-bottom: 10px;
    }

    img {
      cursor: pointer;
      image-orientation: from-image;
    }

    a {
      text-decoration: none;
    }
  }

  .nsfw-blur {
    filter: blur(20px);
    pointer-events: none;
  }

  .post-replies {
    border-left: 2px solid lightgray;
  }

  .content-fade {
    position: relative;
    max-height: 320px;
    overflow: hidden;
    pointer-events: none;

    &:after {
      pointer-events: none;
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-image: linear-gradient(
        rgba(255, 255, 255, 0) 50%,
        rgba(255, 255, 255, 1) 100%
      );
    }
  }

  .dark-fade::after {
    background-image: linear-gradient(
      rgba(255, 255, 255, 0) 50%,
      rgba(30, 30, 30, 1) 100%
    );
  }
}
</style>