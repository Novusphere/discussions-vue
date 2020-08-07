<template>
  <div>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>Editor</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <v-row no-gutters>
          <v-col :cols="12">
            <PostSubmitter ref="submitter" />
          </v-col>
        </v-row>
        <v-row>
          <v-col :cols="6">
            <v-textarea background-color="light-gray" label="Markdown" v-model="markdown"></v-textarea>
          </v-col>
          <v-col :cols="6">
            <v-textarea background-color="light-gray" label="HTML" v-model="html"></v-textarea>
          </v-col>
          <v-col :cols="12">
            <v-textarea background-color="light-gray" label="Info" v-model="info"></v-textarea>
          </v-col>
        </v-row>
        <v-row no-gutters align="end" justify="end">
          <v-btn class="ml-1" color="primary" @click="log()">Log</v-btn>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import PostSubmitter from "@/components/PostSubmitter";

export default {
  name: "TestEditorPage",
  components: {
    PostSubmitter,
  },
  props: {},
  data: () => ({
    markdown: "",
    html: "",
    info: "",
    updateInterval: null,
  }),
  mounted() {
    this.updateInterval = setInterval(() => this.updateData(), 1000);
  },
  beforeDestroy() {
    clearInterval(this.updateInterval);
  },
  methods: {
    updateData() {
      const editor = this.$refs.submitter.getEditor();
      if (!editor) return;

      const html = editor.getHTML();
      const md = editor.getMarkdown();
      const mentions = editor.getMentions();
      const tags = editor.getTags();
      const tips = editor.getTips();

      this.html = html;
      this.markdown = md;
      this.info = [
        JSON.stringify(tags),
        JSON.stringify(mentions),
        JSON.stringify(tips),
      ].join("\n\n");
    },
    testSuggester(query) {
      const items = [
        {
          displayName: "Jacques Whales",
          pub: "EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH",
        },
        {
          displayName: "JohnLazarus",
          pub: "EOS6jhaKkeqmNR26Zxx9DSxknUSjw9WU7Sc6wgePFE8j7VGftWYKV",
        },
        {
          displayName: "ylvaincloutier",
          pub: "EOS62WM3HSxAVhCGwCcGQje7R6hEvrnUPrT6geVcutdNh9vS2anCD",
        },
        {
          displayName: "xia xia xia",
          pub: "EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe",
        },
      ];

      const regex = new RegExp(`^${query}`, "i");
      const filtered = items.filter((i) => regex.test(i.displayName));
      return filtered;
    },
    log() {},
  },
};
</script>