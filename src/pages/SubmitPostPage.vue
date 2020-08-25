<template>
  <BrowsePageLayout>
    <template v-slot:header v-if="community">
      <CommunityCard flat no-view :community="community" />
    </template>
    <template v-slot:content>
      <v-progress-linear v-if="waitSubmit" indeterminate></v-progress-linear>
      <v-card v-else>
        <v-card-text>
          <PostSubmitter
            :draft="'thread'"
            :sub="tag"
            :paywall="paywall"
            ref="submitter"
            :title-field="true"
            @submit-post="submitPost"
          />

          <v-expansion-panels class="mt-2" flat tile :value="false">
            <v-expansion-panel>
              <v-expansion-panel-header style="padding-left: 0px !important">Paywall Options</v-expansion-panel-header>
              <v-expansion-panel-content>
                <v-switch v-model="paywallEnabled" label="Enabled"></v-switch>
                <v-form ref="paywallForm" :disabled="!paywallEnabled">
                  <v-row>
                    <v-col :cols="6">
                      <v-text-field
                        prepend-icon="attach_money"
                        label="Quantity"
                        v-model="paywallAssetAmount"
                      ></v-text-field>
                    </v-col>
                    <v-col :cols="6">
                      <UserAssetSelect
                        no-amount
                        :item-text="`symbol`"
                        allow-zero
                        v-model="paywallAssetSymbol"
                        required
                      ></UserAssetSelect>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col :cols="6">
                      <v-menu
                        v-model="menu1"
                        ref="menu"
                        :close-on-content-click="false"
                        :return-value.sync="paywallExpireDate"
                        transition="scale-transition"
                        offset-y
                        min-width="290px"
                      >
                        <template v-slot:activator="{ on, attrs }">
                          <v-text-field
                            v-model="paywallExpireDate"
                            label="Expiration Date"
                            prepend-icon="event"
                            readonly
                            v-bind="attrs"
                            v-on="on"
                          ></v-text-field>
                        </template>
                        <v-date-picker v-model="paywallExpireDate" no-title scrollable>
                          <v-spacer></v-spacer>
                          <v-btn text color="primary" @click="menu = false">Cancel</v-btn>
                          <v-btn text color="primary" @click="$refs.menu.save(paywallExpireDate)">OK</v-btn>
                        </v-date-picker>
                      </v-menu>
                    </v-col>
                    <v-col :cols="6">
                      <v-menu
                        v-model="menu2"
                        ref="menu2"
                        :close-on-content-click="false"
                        :nudge-right="40"
                        :return-value.sync="paywallExpireTime"
                        transition="scale-transition"
                        offset-y
                        max-width="290px"
                        min-width="290px"
                      >
                        <template v-slot:activator="{ on, attrs }">
                          <v-text-field
                            v-model="paywallExpireTime"
                            label="Expiration Time"
                            prepend-icon="access_time"
                            readonly
                            v-bind="attrs"
                            v-on="on"
                          ></v-text-field>
                        </template>
                        <v-time-picker
                          v-model="paywallExpireTime"
                          full-width
                          @click:minute="$refs.menu2.save(paywallExpireTime)"
                        ></v-time-picker>
                      </v-menu>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col :cols="12">
                      <v-btn
                        :disabled="!paywallEnabled"
                        color="primary"
                        @click="clearPaywall()"
                      >Clear</v-btn>
                    </v-col>
                  </v-row>
                </v-form>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>
    </template>
  </BrowsePageLayout>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import {
  getCommunityByTag,
  getSinglePost,
} from "@/novusphere-js/discussions/api";
import { waitFor, sleep } from "@/novusphere-js/utility";

import { threadLinkMixin } from "@/mixins/threadLink";

import BrowsePageLayout from "@/components/BrowsePageLayout";
import CommunityCard from "@/components/CommunityCard";
//import UserProfileCard from "@/components/UserProfileCard";
import PostSubmitter from "@/components/PostSubmitter";
import UserAssetSelect from "@/components/UserAssetSelect";
import { isValidAsset } from "../novusphere-js/uid";

export default {
  name: "SubmitPostPage",
  mixins: [threadLinkMixin],
  components: {
    BrowsePageLayout,
    //UserProfileCard,
    CommunityCard,
    PostSubmitter,
    UserAssetSelect,
  },
  props: {},
  watch: {
    async editorTags() {
      await this.setTag();
    },
    isLoggedIn() {
      if (!this.isLoggedIn) this.$router.push(`/`);
    },
  },
  computed: {
    ...mapGetters(["isLoggedIn"]),
    ...mapState({
      displayName: (state) => state.displayName,
      keys: (state) => state.keys,
    }),
    paywall() {
      if (!this.paywallEnabled) return undefined;

      const asset = `${this.paywallAssetAmount} ${this.paywallAssetSymbol}`;
      if (!isValidAsset(asset))
        return { $error: `Invalid asset or quantity selected` };

      if (!this.paywallExpireDate)
        return { $error: `You must select an expiry date or click clear` };
      if (!this.paywallExpireTime)
        return { $error: `You must select an expiry time or click clear` };

      const expire = new Date( `${this.paywallExpireDate} ${this.paywallExpireTime}` );

      if (isNaN(expire.getTime()))
        return { $error: `Invalid expiry date time selected, try clicking clear` };

      if (expire.getTime() <= Date.now())
        return {  $error: `This paywall will already have expired by posting it, if this is intentional, consider simply turning paywall off.` };

      return {
        asset,
        expire,
      };
    },
  },
  data: () => ({
    tag: "all",
    community: null,
    editorTags: [],
    stopSyncEditor: false,
    waitSubmit: false,
    paywallEnabled: false,
    paywallAssetAmount: null,
    paywallAssetSymbol: null,
    paywallExpireDate: null,
    paywallExpireTime: null,
    menu1: false,
    menu2: false,
  }),
  async created() {
    if (!this.isLoggedIn) this.$router.push(`/`);
    await this.setTag();

    if (this.tag == "all") {
      this.syncEditorTags();
    }
  },
  async destroyed() {
    this.stopSyncEditor = true;
  },
  mounted() {
    window.addEventListener("beforeunload", this.leaveGuard);
  },
  beforeDestroy() {
    window.removeEventListener("beforeunload", this.leaveGuard);
  },
  beforeRouteLeave(to, from, next) {
    if (this.$refs.submitter && this.$refs.submitter.hasUnsavedInput()) {
      const answer = window.confirm(
        "Do you really want to leave? you have unsaved changes!"
      );
      if (answer) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },
  methods: {
    clearPaywall() {
      console.log(this.paywallExpireTime);
      console.log(this.paywallExpireDate);

      //this.paywallAssetAmount = null;
      //this.paywallAssetSymbol = null;
      this.paywallExpireDate = null;
      this.paywallExpireTime = null;
      this.$refs.paywallForm.resetValidation();
    },
    leaveGuard(e) {
      if (this.$refs.submitter && this.$refs.submitter.hasUnsavedInput()) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = "";
      }
    },
    async submitPost({ post }) {
      this.waitSubmit = true;

      await sleep(250);

      const transaction = post.transaction;
      let p = undefined;

      try {
        await waitFor(
          async () => {
            p = await getSinglePost(transaction);
            return p != undefined;
          },
          500,
          10000
        );

        if (p) {
          const link = this.getThreadLink(p);
          this.$router.push(link);
        } else {
          console.log(`Thread couldnt be found... ${transaction}`);
        }
      } catch (ex) {
        console.log(ex);
        console.log(`Thread couldnt be found... ${transaction}`);
      }
    },
    async syncEditorTags() {
      if (this.stopSyncEditor) return;
      if (this.$refs.submitter) {
        const editorTags = this.$refs.submitter.getEditor().getTags();
        if (
          this.editorTags.length != editorTags.length ||
          !this.editorTags.every((v, i) => v == editorTags[i])
        ) {
          this.editorTags = editorTags;
        }
      }
      setTimeout(() => this.syncEditorTags(), 1000);
    },
    async setTag() {
      let tag = "all";

      if (this.$route.params.tags) {
        tag = this.$route.params.tags.split(",")[0];
      } else if (this.editorTags.length > 0) {
        tag = this.editorTags[0]; // maybe use the most frequently used tag instead?
      }

      const community = await getCommunityByTag(tag);

      this.tag = tag;
      this.community = community ? community : null;
    },
  },
};
</script>