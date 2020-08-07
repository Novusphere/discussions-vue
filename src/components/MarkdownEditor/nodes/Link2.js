import { pasteRule } from 'tiptap-commands';
import {
    Link,
} from "tiptap-extensions";

function encodeURI2(str) {
    str = encodeURI(str);
    str = str.replace(/\(/g, "%28");
    str = str.replace(/\)/g, "%29");
    return str;
}

export default class Link2 extends Link {

    pasteRules({ type }) {
        return [
            pasteRule(
                /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=!()]*)/gi,
                type,
                url => ({ href: encodeURI2(url) }),
            ),
        ]
    }

}