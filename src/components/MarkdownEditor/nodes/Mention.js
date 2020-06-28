// Modified from: https://github.com/scrumpy/tiptap/blob/a6f4e896dc5723cb807e213966d137e487240631/packages/tiptap-extensions/src/nodes/Mention.js

import { Node } from 'tiptap'
import { replaceText } from 'tiptap-commands'
import { Suggestions } from "tiptap-extensions";

export default class Mention extends Node {

  get name() {
    return 'mention'
  }

  get defaultOptions() {
    return {
      matcher: {
        char: '@',
        allowSpaces: false,
        startOfLine: false,
      },
      mentionClass: 'mention',
      suggestionClass: 'mention-suggestion',
    }
  }

  get schema() {
    return {
      attrs: {
        name: {},
        href: {},
      },
      group: 'inline',
      inline: true,
      selectable: false,
      atom: true,
      toDOM: node => [
        'a',
        {
          href: `${node.attrs.href}`,
          rel: 'noopener noreferrer nofollow',
          class: this.options.mentionClass,
        },
        `${this.options.matcher.char}${node.attrs.name}`,
      ],
      parseDOM: [
        // they will be parsed as a link, which is ok
      ],
    }
  }

  commands({ schema }) {
    return attrs => replaceText(null, schema.nodes[this.name], attrs)
  }

  get plugins() {
    return [
      Suggestions({
        command: ({ range, attrs, schema }) => replaceText(range, schema.nodes[this.name], attrs),
        appendText: ' ',
        matcher: this.options.matcher,
        items: this.options.items,
        onEnter: this.options.onEnter,
        onChange: this.options.onChange,
        onExit: this.options.onExit,
        onKeyDown: this.options.onKeyDown,
        onFilter: this.options.onFilter,
        suggestionClass: this.options.suggestionClass,
      }),
    ]
  }

}