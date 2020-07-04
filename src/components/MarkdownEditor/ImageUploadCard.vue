<template>
  <v-card>
    <v-card-title>Image Upload</v-card-title>
    <v-card-text>
      <v-file-input accept="image/*" label="Select image" v-model="files"></v-file-input>
      <div class="text-center" v-show="error">
        <span class="error--text">{{ error }}</span>
      </div>
      <v-btn color="primary" @click="upload()">Upload</v-btn>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapState } from "vuex";
import { uploadImage } from "@/novusphere-js/discussions/api";

export default {
  name: "ImageUploadCard",
  components: {},
  props: {},
  data: () => ({
    files: null,
    error: ""
  }),
  computed: {
    ...mapState({
      onImageUpload: state => state.onImageUpload
    })
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
          const image = this.files;
          const src = await uploadImage(image);
          this.onImageUpload({ src });
          this.$store.commit("setImageUploadDialogOpen", { value: false });
        } catch (error) {
          this.error = error.toString();
        }
      }
    }
  }
};
</script>