<template>
  <div>
    <v-row>
      <v-col :cols="12">
        <v-card>
          <v-card-text>
            <v-row>
              <v-col :cols="12">
                <v-select
                  no-data-text="Try following some users!"
                  hint="Choose who to message"
                  persistent-hint
                  v-model="friendPublicKey"
                  :items="followingUsers"
                  item-text="displayName"
                  item-value="pub"
                  label="Friend"
                  required
                >
                  <template v-slot:item="{ item }">
                    <PublicKeyIcon :publicKey="item.pub" />
                    <span class="ml-2">{{ item.displayName }}</span>
                  </template>
                </v-select>
              </v-col>
              <v-col :cols="12">
                <v-text-field v-model="messageText" label="Enter message">
                  <template v-slot:append-outer>
                    <v-btn @click="sendMessage" color="primary">Send</v-btn>
                  </template>
                </v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        <v-card
          ref="messageBox"
          class="mt-1"
          max-height="600px"
          style="overflow-y: auto"
        >
          <v-card-text>
            <v-row>
              <v-col :cols="12" v-for="(msg, i) in messages" :key="i">
                <span
                  style="display: block"
                  v-if="i == 0 || messages[i].date != messages[i - 1].date"
                  >[{{ messages[i].date }}]</span
                >
                <PublicKeyIcon :publicKey="msg.senderPublicKey" />
                <span>{{ msg.fromDisplayName }}:</span>
                <span class="ml-1">{{ msg.content }}</span>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { searchDirectMessages } from "@/novusphere-js/discussions/api";
import {
  sendDirectMessage,
  decryptDirectMessage,
} from "@/novusphere-js/discussions/gateway";
import { mapState } from "vuex";
import PublicKeyIcon from "@/components/PublicKeyIcon";

export default {
  name: "MessengerPage",
  components: {
    PublicKeyIcon,
  },
  props: {},
  computed: {
    ...mapState({
      followingUsers: (state) => state.followingUsers,
      displayName: (state) => state.displayName,
      keys: (state) => state.keys,
    }),
  },
  data: () => ({
    friendPublicKey: "",
    messageText: "",
    messages: [],
    cursor: null,
  }),
  watch: {
    async friendPublicKey() {
      this.messages = [];
      if (!this.friendPublicKey) return;

      this.cursor = await searchDirectMessages(
        this.keys.arbitrary.key,
        this.friendPublicKey
      );

      const messages = await this.cursor.next();
      for (const msg of messages.reverse()) {
        await this.receiveDirectMessage({ detail: msg });
      }
    },
  },
  created() {
    this._receiveDirectMessage = (e) => this.receiveDirectMessage(e);
    window.addEventListener("receiveDirectMessage", this._receiveDirectMessage);
  },
  beforeDestroy() {
    window.removeEventListener(
      "receiveDirectMessage",
      this._receiveDirectMessage
    );
  },
  methods: {
    async receiveDirectMessage({
      detail: { checksum, data, friendPublicKey, senderPublicKey, nonce, time },
    }) {
      //console.log(checksum, data, fromPublicKey, senderPublicKey, nonce, time);

      if (
        this.keys.arbitrary.pub != friendPublicKey &&
        this.keys.arbitrary.pub != senderPublicKey
      )
        return console.log("Unexpected receiveDirectMessage");

      let fromDisplayName = this.displayName;
      let otherPublicKey = friendPublicKey; // the key that isn't ours

      if (senderPublicKey != this.keys.arbitrary.pub) {
        const friend = this.followingUsers.find(
          (fu) => fu.pub == senderPublicKey
        );
        if (!friend)
          return console.log("friendPublicKey not found in followingUsers");
        fromDisplayName = friend.displayName;
        otherPublicKey = senderPublicKey;
      }

      const content = await decryptDirectMessage(
        this.keys.arbitrary.key,
        otherPublicKey,
        data,
        nonce,
        checksum
      );

      time = new Date(time);

      const msg = {
        friendPublicKey,
        senderPublicKey,
        fromDisplayName,
        content,
        time,
        date: time.toLocaleDateString(),
      };
      if (this.messages.length > 0 && time < this.messages[0].time) {
        this.messages.unshift(msg);
      } else {
        this.messages.push(msg);
        this.scrollBottomMessage();
      }
    },
    scrollBottomMessage() {
        setTimeout(() => {
          const messageBox = this.$refs.messageBox.$el;
          messageBox.scrollTop = messageBox.scrollHeight;
        }, 250);
    },
    async sendMessage() {
      const textMessage = `${this.messageText}`;
      await sendDirectMessage(
        this.keys.arbitrary.key,
        this.friendPublicKey,
        textMessage
      );
    },
  },
};
</script>