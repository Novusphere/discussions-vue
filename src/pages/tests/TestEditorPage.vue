<template>
  <div>
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>Editor</v-toolbar-title>
      </v-toolbar>

      <v-card-text>
        <v-row no-gutters>
          <MarkdownEditor :mention-suggester="testSuggester" ref="editor" />
        </v-row>
        <v-row no-gutters>
          <v-textarea
            background-color="light-gray"
            color="black"
            label="Markdown"
            v-model="markdown"
          ></v-textarea>
        </v-row>
        <v-row no-gutters align="end" justify="end">
          <v-btn color="primary" @click="htmlConvert()">HTML to MD</v-btn>
          <v-btn class="ml-1" color="primary" @click="mdConvert()">MD to HTML</v-btn>
          <v-btn class="ml-1" color="primary" @click="log()">Log</v-btn>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import MarkdownEditor from "@/components/MarkdownEditor";

export default {
  name: "TestEditorPage",
  components: {
    MarkdownEditor
  },
  props: {},
  data: () => ({
    markdown: "",
    file: null
  }),
  methods: {
    async doTest() {

    },
    testSuggester(query) {
      const items = [
        {
          displayName: "Jacques Whales",
          pub: "EOS5epmzy9PGex6uS6r6UzcsyxYhsciwjMdrx1qbtF51hXhRjnYYH"
        },
        {
          displayName: "JohnLazarus",
          pub: "EOS6jhaKkeqmNR26Zxx9DSxknUSjw9WU7Sc6wgePFE8j7VGftWYKV"
        },
        {
          displayName: "ylvaincloutier",
          pub: "EOS62WM3HSxAVhCGwCcGQje7R6hEvrnUPrT6geVcutdNh9vS2anCD"
        },
        {
          displayName: "xia xia xia",
          pub: "EOS5FcwE6haZZNNTR6zA3QcyAwJwJhk53s7UjZDch1c7QgydBWFSe"
        }
      ];

      const regex = new RegExp(`^${query}`, "i");
      const filtered = items.filter(i => regex.test(i.displayName));
      return filtered;
    },
    htmlConvert() {
      this.markdown = this.$refs.editor.getMarkdown();
    },
    mdConvert() {
      this.$refs.editor.setFromMarkdown(this.markdown);
    },
    log() {
      console.log(this.$refs.editor.getHTML());
      console.log(this.$refs.editor.getTags());
      console.log(this.$refs.editor.getMentions());
      console.log(this.$refs.editor.getTips());
    }
  }
};
</script>