// Modified from: https://github.com/scrumpy/tiptap/blob/a6f4e896dc5723cb807e213966d137e487240631/packages/tiptap-extensions/src/nodes/Mention.js

import { Node, Mark } from 'tiptap';
import { replaceText, pasteRule } from 'tiptap-commands';
import { Suggestions } from "tiptap-extensions";

export class HashtagPaste extends Mark {
  get name() {
    return 'hashtagpaste'
  }

  get schema() {
    return {
      attrs: {
        href: {}
      },
      group: 'inline',
      inline: true,
      selectable: false,
      atom: true,
      toDOM: node => ['a', { href: `${node.attrs.href}`, target: `_blank` }, ``,],
      parseDOM: [],
    }
  }

  pasteRules({ type }) {
    return [
      pasteRule(
        /#[a-zA-Z0-9]+/gi,
        type,
        (match) => ({ href: `/tag/${match.substring(1)}`, tag: '' }),
      ),
    ]
  }
}

export class Hashtag extends Node {
  get name() {
    return 'hashtag'
  }

  get defaultOptions() {
    return {
      matcher: {
        char: '#',
        allowSpaces: false,
        startOfLine: false,
      }
    }
  }

  get schema() {
    return {
      attrs: {
        tag: {},
        href: {}
      },
      group: 'inline',
      inline: true,
      selectable: false,
      atom: true,
      toDOM: node => ['a', { href: `${node.attrs.href}`, target: `_blank`, }, `${this.options.matcher.char}${node.attrs.tag}`],
      parseDOM: [], // they will be parsed as a link, which is ok
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
        onFilter: this.options.onFilter
      }),
    ]
  }
}