<template>
  <v-card>
    <v-card-title>Image Upload</v-card-title>
    <v-card-text>
      <v-file-input accept="image/*" label="Select image" v-model="files"></v-file-input>
      <div class="text-center" v-show="error">
        <span class="error--text">{{ error }}</span>
      </div>
      <v-btn color="primary" @click="upload()" :disabled="disabled">
        <v-progress-circular class="mr-2" indeterminate v-if="disabled"></v-progress-circular>Upload
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
import { uploadImage } from "@/novusphere-js/discussions/api";
//import { sleep } from "@/novusphere-js/utility";

export default {
  name: "ImageUploadCard",
  components: {},
  props: {},
  data: () => ({
    files: null,
    error: "",
    disabled: false
  }),
  computed: {
    ...mapState({
      onImageUpload: state => state.onImageUpload
    })
  },
  mounted() {
    if (
      navigator.userAgent.match(/safari/i) &&
      !navigator.userAgent.match(/chrome/i)
    ) {
      console.log(`Using safari v-file-input fix...`);
      let inputs = document.querySelectorAll(".v-file-input input");
      [...inputs].forEach(input => {
        input.remove();
      });
    }
  },
  methods: {
    async upload() {
      this.error = "";
      if (!this.files) {
        this.error = "No files selected!";
        return;
      }
      if (this.onImageUpload) {
        try {
          this.disabled = true;
          //await sleep(5000);
          const image = this.files;
          const src = await uploadImage(image);
          this.onImageUpload({ src });
          this.disabled = false;
        } catch (error) {
          this.error = error.toString();
          this.disabled = false;
        }
      }
    }
  }
};
</script>