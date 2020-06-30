import { pasteRule } from 'tiptap-commands';
import {
    Link,
} from "tiptap-extensions";

export default class Link2 extends Link {

    pasteRules({ type }) {
        return [
            pasteRule(
                /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi,
                type,
                url => ({ href: url }),
            ),
        ]
    }

}