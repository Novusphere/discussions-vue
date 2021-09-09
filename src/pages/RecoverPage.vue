<template>
  <v-row>
    <v-col :cols="12">
      <v-card>
        <v-card-text>
          <v-text-field label="Display Name" v-model="displayName" />
          <v-text-field label="Password" v-model="password" />
          <v-btn block @click="recover">Recover</v-btn>
          <v-textarea :rows="10" v-model="result" readonly />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import axios from "axios";
import { decrypt, isValidBrainKey } from "@/novusphere-js/uid";

export default {
  name: "RecoverPage",
  components: {},
  props: {},
  data: () => ({
    displayName: "",
    password: "",
    result: "",
  }),
  created() {},
  methods: {
    async recover() {
      const url = `https://old.discussions.app/v1/api/account/recover?displayName=${encodeURIComponent(
        this.displayName
      )}`;
      const {
        data: { payload: mnemonics },
      } = await axios.get(url);

      let result = `Found ${mnemonics.length} accounts with display name "${this.displayName}"\n\n`;
      if (mnemonics.length == 0) {
        result += `No accounts found!`;
      } else {
        for (let i = 0; i < mnemonics.length; i++) {
          try {
            const encryptedBrainKey = mnemonics[i];
            const brainKey = decrypt(encryptedBrainKey, this.password);
            if (!isValidBrainKey(brainKey)) {
              throw new Error();
            }
            result += `Decrypted account ${i+1}:\n======\n${brainKey}\n======\n\n`;
          } catch (ex) {
              result += `Failed to decrypt account ${i+1}, invalid password?\n\n`;
          }
        }
      }

      this.result = result;
    },
  },
};
</script>