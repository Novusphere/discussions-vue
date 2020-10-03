import bigInt from 'big-integer';
import { markdownToHTML, getOEmbedHtml, getOEmbedMeta, IMAGE_REGEX, LINK_REGEX, TIME_ENCODE_GENESIS } from "@/novusphere-js/utility";
import { oembed } from "@/novusphere-js/discussions/api";
import { isValidAsset } from "@/novusphere-js/uid";
import { createDOMParser } from "@/novusphere-js/utility";
import siteConfig from "@/server/site";

export class Post {
    static Paywall(asset, expiration) {
        if (!isValidAsset(asset)) throw new Error(`${asset} is not a valid asset`);
        if (isNaN(expiration)) throw new Error(`Expiration is not a number. Use 0 for indefinite.`);

        return {
            asset,
            expiration
        }
    }

    constructor(chain) {
        // This constructor should set ALL fields that should ever be present within the [Post] object
        // If new fields are added, it should be added here as well

        this.id = (Math.random() * 0xffffffff) | 0;
        this.transaction = '';
        this.blockApprox = 0;
        this.chain = chain;
        this.editUuid = '';
        this.parentUuid = '';
        this.threadUuid = '';
        this.uuid = '';
        this.title = '';
        this.poster = '';
        this.displayName = '';
        this.content = '';
        this.createdAt = new Date(0);
        this.editedAt = new Date(0);
        this.sub = '';
        this.tags = [];
        this.mentions = [];
        this.edit = false;
        this.pub = '';
        this.sig = '';
        this.replies = [];
        this.totalReplies = 0;
        this.score = 0;
        this.upvotes = 0;
        this.downvotes = 0;
        this.myVote = 0; // not voted (neutral)
        this.tips = [];
        this.modPolicy = []; // [{mod, tags}]
        this.paywall = undefined;
        this.views = 0;

        // if api specified [includeOpeningPost] this field will be populated with another Post object
        this.op = undefined;

        // if api [createThreadTree] has been called, then this field is set
        this.depth = 0;
        this.threadTree = undefined;
    }

    static fromDbObject(o) {
        // Takes a post json object from db and transforms it into a [Post] object

        let p = new Post(o.chain);
        p.id = o.id;
        p.transaction = o.transaction;
        p.blockApprox = o.blockApprox;
        p.uuid = o.uuid;
        p.parentUuid = o.parentUuid;
        p.threadUuid = o.threadUuid;
        p.title = o.title;
        p.poster = o.poster;
        p.displayName = o.displayName;
        p.content = o.content;
        p.createdAt = new Date(o.createdAt);
        p.sub = o.sub;
        p.tags = o.tags;
        p.mentions = o.mentions;

        if (o.edit) {
            p.edit = true;
            p.editUuid = o.edit;
            p.editedAt = new Date(o.editedAt);
        }

        p.pub = o.pub;
        p.sig = o.sig;

        p.totalReplies = o.totalReplies;
        p.upvotes = o.upvotes;
        p.downvotes = o.downvotes;
        p.uidw = o.uidw || null;

        if (o.myVote && o.myVote.length > 0) {
            p.myVote = o.myVote[0].value;
        }

        p.tips = o.tips || [];

        if (o.op && o.op.length > 0) {
            let op = o.op[0];
            p.op = Post.fromDbObject(op);
        }

        if (o.modPolicy) {
            const domain = window.location.host;
            p.modPolicy = o.modPolicy.filter(mp => mp.domain == domain);
        }

        if (o.paywall) {
            p.paywall = {
                asset: o.paywall.asset,
                expire: new Date(o.paywall.expire)
            }
        }

        p.views = o.views || 1;

        return p;
    }

    get isSpam() {
        // a post is only spam if it's been marked as spam via mod pol
        return this.modPolicy.some(mp => mp.tags.some(t => t == 'spam'));
    }

    get isPinned() {
        // a post is only pinned if it's been marked as pinned via mod pol
        return this.modPolicy.some(mp => mp.tags.some(t => t == 'pinned'));
    }

    get isNSFW() {
        // a post can be self-marked NSFW or via mod pol
        return (this.sub == 'nsfw' || this.tags.some(t => t == 'nsfw')) ||
            (this.modPolicy.some(mp => mp.tags.some(t => t == 'nsfw')));
    }

    static decodeId(id) {
        let n = bigInt(id, 36);
        let txid32 = n
            .shiftRight(32)
            .toString(16)
            .padStart(8, '0');
        let timeOffset = n.and(bigInt('ffffffff', 16));

        let time = //Number(timeOffset)
            timeOffset.valueOf()
            * 1000 + TIME_ENCODE_GENESIS;

        return {
            txid32: txid32,
            timeGte: time - 1000 * 60 * 3,
            timeLte: time + 1000 * 60 * 3,
        }
    }

    static encodeId(transaction, createdAt) {
        let txid32 = bigInt(transaction.substring(0, 8), 16);
        let timeOffset = bigInt(
            Math.floor((createdAt.getTime() - TIME_ENCODE_GENESIS) / 1000),
            10
        );
        let id = txid32.shiftLeft(32).or(timeOffset);
        return id.toString(36);
    }

    getSnakeCaseTitle() {
        if (!this.title) return '_';
        const title = this.title
            .replace(/[^0-9a-z]/gi, ' ')
            .split(' ')
            .filter(s => s && s.length >= 2)
            .map(s => s.toLowerCase())
            .join('-');
        return title || '_';
    }

    async getContentDocument() {
        let md = this.content;
        md = md.replace(/[\ufffc-\uffff]/g, "");

        // image server migration 10/3/2020
        md = md.replace(/https:\/\/atmosdb.novusphere.io\/discussions\/upload\/image\/[a-z0-9]+.(jpeg|jpg|png|gif)/, function (ss) {
            const parts = ss.split('/');
            return `https://s2.discussions.app/v1/api/upload/file/${parts[parts.length - 1]}`;
        });

        //console.log(md);

        const html = markdownToHTML(md);
        let domParser = createDOMParser();
        let doc = domParser.parseFromString(html, 'text/html');
        return doc;
    }

    async getMeta() {
        //if (typeof window != 'undefined') return {}; // client side

        const result = {};
        await this.getContentHTML(async (type, data) => {
            if (type == 'oembed') {
                const meta = await getOEmbedMeta(data);

                for (const key in meta) {
                    if (!result[key] && meta[key]) {
                        result[key] = meta[key];
                    }
                }
            }
        });

        return result;
    }

    async getAllContentImages() {
        let doc = await this.getContentDocument();
        let imgs = [];

        for (const { src } of Array.from(doc.images)) {
            if (src) {
                imgs.push(src);
            }
        }

        for (const { href } of Array.from(doc.links)) {
            if (new RegExp(IMAGE_REGEX).test(href)) {
                imgs.push(href);
            }
        }

        return imgs;
    }

    async getContentImage() {
        return (await this.getAllContentImages())[0];
    }

    getRelativeUrl(includeTitle = true) {
        let link = `/tag/${this.sub}`;
        if (this.op && this.transaction != this.op.transaction) {
            link += `/${this.op.getEncodedId()}/${includeTitle ? this.op.getSnakeCaseTitle() : '_'}/${this.getEncodedId()}`;
        } else {
            link += `/${this.getEncodedId()}/${includeTitle ? this.getSnakeCaseTitle() : '_'}`;
        }
        return link;
    }

    async getContentText({ removeImages }) {
        let doc = await this.getContentDocument();
        let text = doc.body.innerText || doc.body.textContent;

        if (removeImages) {
            text = text.replace(IMAGE_REGEX, '');
        }

        return text;
    }

    async getContentHTML(emit) {
        let doc = await this.getContentDocument();

        function linkEquals(l1, l2) {
            try { l1 = decodeURI(l1); }
            catch (ex1) {
                // ...
            }
            try { l2 = decodeURI(l2); }
            catch (ex2) {
                // ...
            }

            const l1q = l1.indexOf('?');
            if (l1q > -1) {
                l1 = l1.substring(0, l1q);
            }

            const l2q = l2.indexOf('?');
            if (l2q > -1) {
                l2 = l2.substring(0, l2q);
            }

            if (l1.lastIndexOf('/') != l1.length - 1)
                l1 += '/';

            if (l2.lastIndexOf('/') != l2.length - 1)
                l2 += '/';

            return (l1 == l2);
        }

        // transform text that is a link into an actual anchor link
        (function recursiveLinkify(node) {
            for (const child of node.childNodes)
                recursiveLinkify(child);

            if (node.nodeType == Node.TEXT_NODE) {
                if (node.parentNode.tagName == 'A') return;

                let replacements = 0;
                const fixed = node.textContent.replace(new RegExp(LINK_REGEX), (s) => {
                    replacements++;
                    return `<a href="${s}">${s}</a>`
                });

                if (replacements > 0) {
                    const span = doc.createElement('span');
                    span.innerHTML = fixed;
                    node.parentNode.insertBefore(span, node);
                    node.remove();
                }
            }
        })(doc.body);

        const botRegex = new RegExp(siteConfig.botUserAgents.join('|'), 'i');
        if (typeof navigator == "undefined" || !navigator.userAgent.match(botRegex)) {
            for (const node of Array.from(doc.links)) {

                let href = node.href;
                let innerText = node.innerText;

                //
                // guard against hyperlinks
                // https://github.com/Novusphere/discussions-vue/issues/179
                //
                if (!linkEquals(href, innerText)) continue;

                href = decodeURI(href);

                let innerHTML = undefined;

                try {
                    const { insertHTML, oembed: cors } = getOEmbedHtml(href);

                    if (emit) {
                        if ((insertHTML || cors)) {
                            await emit('oembed', href);
                        }
                    }
                    else {
                        if (insertHTML)
                            innerHTML = insertHTML;
                        else if (cors) {
                            const { html } = await oembed(href);
                            if (html) {
                                innerHTML = html;
                            }
                        }
                    }
                }
                catch (ex) {
                    innerHTML = undefined;
                    console.log(ex);
                }

                if (!innerHTML) continue;

                const div = doc.createElement('div');
                div.classList.add('post-embed-content');
                div.innerHTML = innerHTML;

                node.parentNode.insertBefore(div, node);
                if (href == innerText) {
                    node.remove();
                }
            }
        }

        let resultHtml = doc.body.innerHTML;
        resultHtml = resultHtml.replace(/&nbsp;/g, " ");

        return resultHtml;
    }

    getVoteScore() {
        return Math.max(0, this.upvotes - this.downvotes);
    }

    getEncodedId() {
        return Post.encodeId(this.transaction, this.createdAt)
    }

    equalsReferenceId(id) {
        return this.transaction == id || this.uuid == id || this.getEncodedId() == id;
    }

    setMyModPolicy(myKey, tags) {
        const pol = this.modPolicy.find(mp => mp.mod == myKey);
        if (pol) pol.tags = tags;
        else this.modPolicy.push({ mod: myKey, tags });
    }

    getMyModPolicy(myKey) {
        const pol = this.modPolicy.find(mp => mp.mod == myKey);
        return pol ? pol.tags : [];
    }
}