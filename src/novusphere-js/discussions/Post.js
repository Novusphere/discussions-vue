import ecc from 'eosjs-ecc'
import bigInt from 'big-integer';
import { markdownToHTML, generateUuid } from "@/novusphere-js/utility";
import { cors } from "@/novusphere-js/discussions/api";
import { createDOMParser } from "@/novusphere-js/utility";

// Posts Ids are encoded with the first 32 bits being from the transaction id, and then following 16 bits from the time offset
const TIME_ENCODE_GENESIS = 1483246800000 // 2017-1-1
const IMAGE_REGEX = (/(.|)http[s]?:\/\/(\w|[:/.%-])+\.(png|jpg|jpeg|gif)(\?(\w|[:/.%-])+)?(.|)/gi);

export class Post {
    isOpeningPost() {
        return (this.parentUuid) == '' && (this.uuid == this.threadUuid);
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

        // if api specified [includeOpeningPost] this field will be populated with another Post object
        this.op = undefined;

        // if api [createThreadTree] has been called, then this field is set
        this.depth = 0;
        this.threadTree = undefined;
    }

    static fromDbObject(o) {
        // Takes a post json object from AtmosDB and transforms it into a [Post] object

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
            p.modPolicy = o.modPolicy;
        }

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

    async getContentDocument() {
        const html = markdownToHTML(this.content);
        let domParser = createDOMParser();
        let doc = domParser.parseFromString(html, 'text/html');
        return doc;
    }

    async getContentImage() {
        let doc = await this.getContentDocument();

        for (const { href } of Array.from(doc.links)) {
            if (IMAGE_REGEX.test(href)) {
                return href;
            }
        }

        return undefined;
    }

    async getContentText({ removeImages }) {
        let doc = await this.getContentDocument();
        let text = doc.body.innerText || doc.body.textContent;

        if (removeImages) {
            text = text.replace(IMAGE_REGEX, '');
        }

        return text;
    }

    async getContentHTML() {
        let doc = await this.getContentDocument();

        for (const node of Array.from(doc.links)) {

            const { href, innerText } = node;
            let insertHTML = undefined;
            let oembed = undefined;

            if (IMAGE_REGEX.test(href) ||
                (/https?:\/\/(www.)?tradingview.com\/x\//gi).test(href)) {
                // Images auto embed
                // Trading view chart image
                insertHTML = `<img src="${href}" alt="${href}" />`;
            }
            else if ((/t.me\/([a-zA-Z0-9_!@+]+)\/([a-zA-Z0-9]+)/gi).test(href)) {
                // Telegram
                const [, ids] = href.split('t.me/')
                if (ids) {
                    insertHTML = `<span data-telegram-rn="${generateUuid()}" data-telegram-post="${ids}" data-width="100%"></span>`
                }
            }
            else if ((/https:\/\/twitter.com\/[a-zA-Z0-9-_]+\/status\/[0-9]+/gi).test(href)) {
                // Twitter
                oembed = `https://publish.twitter.com/oembed?url=${href}`;
            }
            else if ((/https?:\/\/www.youtube.com\/watch\?feature=(.*?)&v=[a-zA-Z0-9-_]+/).test(href) ||
                (/https?:\/\/www.youtube.com\/watch\?t=[0-9]+/).test(href) ||
                (/https?:\/\/(www|m)?.youtube.com\/watch\?v=[a-zA-Z0-9-_]+/).test(href) ||
                (/https?:\/\/youtu.be\/[a-zA-Z0-9-_]+/).test(href)) {
                // Youtube
                oembed = `https://www.youtube.com/oembed?format=json&url=${href.replace(/feature=(.*?)&/, '')}`;
            }
            else if ((/https?:\/\/www.instagr.am(\/[a-zA-Z0-9-_]+)?\/p\/[a-zA-Z0-9-_]+(\/?.+)?/i).test(href) ||
                (/https?:\/\/www.instagram.com(\/[a-zA-Z0-9-_]+)?\/p\/[a-zA-Z0-9-_]+(\/?.+)?/i).test(href)) {
                // Instagram
                oembed = `https://api.instagram.com/oembed/?url=${href}`;
            }
            else if ((/soundcloud/).test(href)) {
                // Sound Cloud
                oembed = `https://soundcloud.com/oembed?format=json&url=${href}`;
            }

            if (oembed) {
                try {
                    const oembedResult = await cors(oembed);
                    if (oembedResult.html) {
                        insertHTML = oembedResult.html;
                    }
                }
                catch (ex) {
                    // failed...
                }
            }

            if (!insertHTML) continue;

            const div = document.createElement('div');
            div.innerHTML = insertHTML;

            node.parentNode.insertBefore(div, node);
            if (href == innerText) {
                node.remove();
            }
        }

        return doc.body.innerHTML;
    }

    getVoteScore() {
        return Math.max(0, this.upvotes - this.downvotes);
    }

    getEncodedId() {
        return Post.encodeId(this.transaction, this.createdAt)
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

    getSignHash(uuid) {
        const hash0 = ecc.sha256(this.content)
        const hash1 = ecc.sha256(uuid + hash0)
        return hash1;
    }

    sign(privKey) {
        this.pub = ecc.privateToPublic(privKey);
        this.sig = ecc.sign(this.getSignHash(this.uuid), privKey);
        return this.sig;
    }
}