<template>
  <div class="editor">
    <div>
      <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
        <div class="menubar">
          <v-btn icon @click="commands.heading({ level: 1 })">
            <v-icon :class="{ 'is-active': isActive.heading({ level: 1 })  }">title</v-icon>
          </v-btn>

          <v-btn icon @click="commands.bullet_list">
            <v-icon :class="{ 'is-active': isActive.bullet_list() }">format_list_bulleted</v-icon>
          </v-btn>

          <v-btn icon @click="commands.bold">
            <v-icon :class="{ 'is-active': isActive.bold() }">format_bold</v-icon>
          </v-btn>

          <v-btn icon @click="commands.italic">
            <v-icon :class="{ 'is-active': isActive.italic() }">format_italic</v-icon>
          </v-btn>

          <v-btn icon @click="commands.blockquote">
            <v-icon :class="{ 'is-active': isActive.blockquote() }">format_quote</v-icon>
          </v-btn>

          <v-btn icon @click="commands.link">
            <v-icon>insert_link</v-icon>
          </v-btn>

          <v-btn icon>
            <v-icon>insert_photo</v-icon>
          </v-btn>
        </div>
      </editor-menu-bar>

      <editor-content class="editor-content" :editor="editor" />
    </div>
    <div v-show="showSuggestions" ref="suggestions">
      <v-card>
        <template v-if="hasResults">
          <v-list-item v-for="(user, i) in filteredUsers" :key="i" @click="selectUser(user)">
            <PublicKeyIcon :publicKey="user.pub" />
            {{ user.displayName }}
          </v-list-item>
        </template>
        <div v-else>
          <v-card-text>No users found</v-card-text>
        </div>
      </v-card>
    </div>
  </div>
</template>

<script>
import tippy, { sticky } from "tippy.js";
import PublicKeyIcon from "@/components/PublicKeyIcon";
import { Editor, EditorContent, EditorMenuBar } from "tiptap";
import {
  Blockquote,
  CodeBlock,
  HardBreak,
  Heading,
  OrderedList,
  BulletList,
  ListItem,
  TodoItem,
  TodoList,
  Bold,
  Code,
  Italic,
  Strike,
  Underline,
  History
} from "tiptap-extensions";

import Link2 from "./nodes/Link2";
import Mention from "./nodes/Mention";
import Hashtag from "./nodes/Hashtag";

import { htmlToMarkdown, markdownToHTML } from "@/novusphere-js/utility";

export default {
  name: "MarkdownEditor",

  components: {
    EditorMenuBar,
    EditorContent,
    PublicKeyIcon
  },
  props: {
    mentionSuggester: Function
  },
  data() {
    return {
      // mention suggestion
      query: null,
      suggestionRange: null,
      filteredUsers: [],
      insertMention: () => {},
      // hashtag insertion
      tag: null,
      tagRange: null,
      insertTag: () => {},
      // editor
      editor: new Editor({
        extensions: [
          new Hashtag({
            // is called when a suggestion starts
            onEnter: ({ query, range, command }) => {
              this.tag = query;
              this.tagRange = range;
              // we save the command for inserting a selected mention
              // this allows us to call it inside of our custom popup
              // via keyboard navigation and on click
              this.insertTag = command;
            },
            // is called when a suggestion has changed
            onChange: ({ query, range }) => {
              this.tag = query;
              this.tagRange = range;
            },
            // is called when a suggestion is cancelled
            onExit: () => {
              // reset all saved values
              this.tag = null;
              this.tagRange = null;
              this.insertTag = () => {};
            },
            // is called on every keyDown event while a suggestion is active
            onKeyDown: ({ event }) => {
              if (
                event.key === "Enter" ||
                event.key == " " ||
                event.key == "Tab"
              ) {
                this.insertTag({
                  range: this.tagRange,
                  attrs: {
                    tag: this.tag,
                    href: `/tag/${this.tag}`
                  }
                });
                this.editor.focus();
                return true;
              }
              return false;
            }
          }),

          new Mention({
            // is called when a suggestion starts
            onEnter: ({ items, query, range, command, virtualNode }) => {
              this.query = query;
              this.filteredUsers = items;
              this.suggestionRange = range;
              this.renderPopup(virtualNode);
              // we save the command for inserting a selected mention
              // this allows us to call it inside of our custom popup
              // via keyboard navigation and on click
              this.insertMention = command;
            },
            // is called when a suggestion has changed
            onChange: ({ items, query, range, virtualNode }) => {
              this.query = query;
              this.filteredUsers = items;
              this.suggestionRange = range;
              this.renderPopup(virtualNode);
            },
            // is called when a suggestion is cancelled
            onExit: () => {
              // reset all saved values
              this.query = null;
              this.filteredUsers = [];
              this.suggestionRange = null;
              this.destroyPopup();
            },
            // is called on every keyDown event while a suggestion is active
            onKeyDown: ({ event }) => {
              if (
                event.key === "Enter" ||
                event.key == " " ||
                event.key == "Tab"
              ) {
                const user = this.filteredUsers[0];
                if (user) {
                  this.selectUser(user);
                }
                return true;
              }
              return false;
            },
            // is called when a suggestion has changed
            onFilter: (_, query) => {
              //console.log(this);
              return this.getMentionSuggestions(query);
            }
          }),

          new Blockquote(),
          new CodeBlock(),
          new HardBreak(),
          new Heading({ levels: [1, 2, 3] }),
          new BulletList(),
          new OrderedList(),
          new ListItem(),
          new TodoItem(),
          new TodoList(),
          new Bold(),
          new Code(),
          new Italic(),
          new Link2(),
          new Strike(),
          new Underline(),
          new History()
        ],
        content: ``
      })
    };
  },

  computed: {
    hasResults() {
      return this.filteredUsers.length;
    },
    showSuggestions() {
      return this.query || this.hasResults;
    }
  },

  methods: {
    getMentionSuggestions(query) {
      if (this.mentionSuggester) {
        return this.mentionSuggester(query);
      }
      return [];
    },
    getDocument() {
      const html = this.getHTML();
      const domParser = new DOMParser();
      const doc = domParser.parseFromString(html, "text/html");
      return doc;
    },
    getHTML() {
      return this.editor.getHTML();
    },
    getMarkdown() {
      const markdown = htmlToMarkdown(this.getHTML());
      return markdown;
    },
    getTips() {
      let tips = [];

      const doc = this.getDocument();
      const html = doc.body.innerHTML;

      const tipMatch = /<a href="\/tag\/tip" .+?>#tip<\/a>\s[0-9.]+\s[A-Z]+(\s<a href="\/u\/.+?<\/a>)?/gi;
      const matches = [...html.matchAll(tipMatch)].map(m => m[0]);

      for (const tipString of matches) {
        const endATag = `</a>`;
        const hrefField = `href="`;

        let parsedString = tipString.substring(
          tipString.indexOf(endATag) + endATag.length
        );

        let [quantity, symbol] = parsedString.split(" ").filter(s => s);

        parsedString = parsedString.substring(
          parsedString.indexOf(hrefField) + hrefField.length
        );
        parsedString = parsedString.substring(0, parsedString.indexOf(`"`));

        let urlFragment = parsedString.split("-");

        let pub = urlFragment[urlFragment.length - 1];

        tips.push({ quantity, symbol, pub }); // note the public key here is their arbitrary public key!
      }

      return tips;
    },
    getTags() {
      let tags = [];
      const doc = this.getDocument();
      for (const link of Array.from(doc.links)) {
        const hrefSplit = link.href.split("/");
        if (
          link.innerText.indexOf("#") == 0 &&
          hrefSplit.length >= 2 &&
          hrefSplit[hrefSplit.length - 2] == "tag"
        ) {
          tags.push(hrefSplit[hrefSplit.length - 1]);
        }
      }
      return tags;
    },
    getMentions() {
      let mentions = [];
      const doc = this.getDocument();
      for (const link of Array.from(doc.links)) {
        const hrefSplit = link.href.split("/");
        if (
          link.innerText.indexOf("@") == 0 &&
          hrefSplit.length >= 2 &&
          hrefSplit[hrefSplit.length - 2] == "u"
        ) {
          const who = hrefSplit[hrefSplit.length - 1].split("-");
          mentions.push({
            displayName: decodeURIComponent(who[who.length - 2]),
            pub: who[who.length - 1]
          });
        }
      }
      return mentions;
    },
    clear() {
      this.editor.setContent("");
    },
    setFromMarkdown(markdown) {
      const html = markdownToHTML(markdown);
      this.editor.setContent(html);
    },
    // we have to replace our suggestion text with a mention
    // so it's important to pass also the position of your suggestion text
    selectUser(user) {
      this.insertMention({
        range: this.suggestionRange,
        attrs: {
          name: user.displayName.replace(/\s/g, "_"), // replace spaces in name with an underscore
          href: `/u/${user.displayName}-${user.pub}`
        }
      });
      this.editor.focus();
    },
    // renders a popup with suggestions
    // tiptap provides a virtualNode object for using popper.js (or tippy.js) for popups
    renderPopup(node) {
      if (this.popup) {
        return;
      }
      // ref: https://atomiks.github.io/tippyjs/v6/all-props/
      this.popup = tippy(".v-application", {
        getReferenceClientRect: node.getBoundingClientRect,
        appendTo: () => document.body,
        interactive: true,
        sticky: true, // make sure position of tippy is updated when content changes
        plugins: [sticky],
        content: this.$refs.suggestions,
        trigger: "mouseenter", // manual
        showOnCreate: true,
        placement: "top-start",
        inertia: true,
        duration: [400, 200]
      });
    },
    destroyPopup() {
      if (this.popup) {
        this.popup[0].destroy();
        this.popup = null;
      }
    }
  },

  beforeDestroy() {
    this.destroyPopup();
    this.editor.destroy();
  }
};
</script>

<style >
.ProseMirror:focus {
  outline: none;
}
</style>

<style lang="scss" scoped>
.editor {
  width: 100%;
  padding: 5px;
  border-style: solid;
  border-width: 1px;
}

.menubar {
  border-style: solid;
  border-width: 1px;
}

.is-active {
  color: white !important;
  background-color: black !important;
}
</style>