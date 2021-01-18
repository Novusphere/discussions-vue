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
        <v-card class="mt-1">
          <v-card-text>
            <v-textarea
              :rows="20"
              v-model="tempMessages"
              label="Message History"
              readonly
            ></v-textarea>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { sendDirectMessage, decryptDirectMessage } from "@/novusphere-js/discussions/gateway";
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
    tempMessages: "",
  }),
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
      
      if (this.keys.arbitrary.pub != friendPublicKey && this.keys.arbitrary.pub != senderPublicKey) return console.log('Unexpected receiveDirectMessage');

      let fromDisplayName = this.displayName;
      let otherPublicKey = friendPublicKey; // the key that isn't ours

      if (senderPublicKey != this.keys.arbitrary.pub) {
        const friend = this.followingUsers.find(fu => fu.pub == senderPublicKey);
        if (!friend) return console.log('friendPublicKey not found in followingUsers');
        fromDisplayName = friend.displayName;
        otherPublicKey = senderPublicKey;
      }
    
      const decryptedMessage = await decryptDirectMessage(this.keys.arbitrary.key, otherPublicKey, data, nonce, checksum);
      this.tempMessages += `[${new Date(time).toLocaleString()}] ${fromDisplayName}: ${decryptedMessage}\r\n\r\n`;
    },
    async sendMessage() {
      const textMessage = `${this.messageText}`;
      console.log(
        await sendDirectMessage(
          this.keys.arbitrary.key,
          this.friendPublicKey,
          textMessage
        )
      );
    },
  },
};
</script>