import Showdown from "showdown";
import Turndown from "turndown";
import sanitizeHTML from "sanitize-html";
import fs from 'fs';
import { uuid } from "uuidv4";
import Lock from "./lock";
import { oembed } from "../discussions/api";

// Posts Ids are encoded with the first 32 bits being from the transaction id, and then following 16 bits from the time offset
const TIME_ENCODE_GENESIS = 1483246800000 // 2017-1-1
const IMAGE_REGEX = (/(.|)http[s]?:\/\/(\w|[:/.%-])+\.(png|jpg|jpeg|gif)(\?(\w|[:/.%-])+)?(.|)/gi);
const LINK_REGEX = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=!]*)/gi);

const LBRY_REGEX = /http(s)?:\/\/(open.lbry.com|lbry.tv)\/(@[A-Za-z0-9]+:[a-z0-9]+\/)?[A-Za-z0-9-_]+:[a-z0-9]+/gi;
const YOUTUBE_REGEX = /https?:\/\/(www.|m.)?youtube.com\/watch/gi;
const YOUTUBE_SHORT_REGEX = /https?:\/\/youtu.be\/[a-zA-Z0-9-_]+/gi;


const turndownService = new Turndown();
const showdownService = new Showdown.Converter({
    smartIndentationFix: true,
    simpleLineBreaks: true
});

function sanitize(html) {
    return sanitizeHTML(html, {
        allowedTags: [
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "blockquote",
            "p",
            "a",
            "ul",
            "ol",
            "nl",
            "li",
            "b",
            "i",
            "img",
            "strong",
            "em",
            "strike",
            "code",
            // 'hr',
            "br",
            // 'div',
            // 'table',
            // 'thead',
            "caption"
            // 'tbody',
            // 'tr',
            // 'th',
            // 'td',
            // 'pre',
            // 'iframe',
        ],
        allowedAttributes: {
            ...sanitizeHTML.defaults.allowedAttributes
        }
    });
}

function htmlToMarkdown(html) {
    const markdown = turndownService.turndown(sanitize(html));
    return markdown;
}

function markdownToHTML(md) {
    const html = showdownService.makeHtml(md);
    return html;
}

function htmlToText(html) {
    const domParser = createDOMParser();
    let doc = domParser.parseFromString(html, 'text/html');
    return doc.body.innerText || doc.body.textContent;
}

function generateUuid() {
    return uuid();
}

function waitFor(predicate, sleep = 5, timeOut, errorMessage) {
    let waited = 0;
    return new Promise((resolve, reject) => {
        async function attempt() {
            if (await predicate()) resolve();
            else if (timeOut && waited >= timeOut) {
                return reject(new Error(errorMessage || `Wait for condition has exceeded limit`));
            }
            else {
                setTimeout(attempt, sleep);
                waited += sleep;
            }
        }
        attempt();
    });
}

function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

async function getFromCache(cache, name, createAsync) {
    if (cache[name] == true) {
        await waitFor(async () => cache[name] != true);
    }

    if (!cache[name]) {
        cache[name] = true;
        try {
            cache[name] = await createAsync();
        }
        catch (ex) {
            console.log(ex);
            cache[name] = undefined;
        }
    }
    return cache[name];
}

function createDOMParser() {
    let domParser = undefined;
    if (typeof DOMParser !== 'undefined') {
        domParser = new DOMParser();
    }
    else {
        const jsdom = require("jsdom");
        const { JSDOM } = jsdom;
        domParser = new (new JSDOM()).window.DOMParser();
    }
    return domParser;
}

function getConfig(name, template) {
    const section = {};
    const fn = `./config/${name}.json`;
    if (fs.existsSync(fn)) {
        const config = JSON.parse(fs.readFileSync(fn));
        Object.assign(section, config);
    }
    else if (template) {
        Object.assign(section, template);
    }
    return section;
}

function saveConfig(name, config) {
    const fn = `./config/${name}.json`;
    fs.writeFileSync(fn, JSON.stringify(config));
}

function getShortPublicKey(publicKey) {
    return publicKey.substring(publicKey.length - 4);
}

async function getOEmbedMeta(href) {

    //console.log(`getOEmbedMeta ${href}`);

    function ogVideo(preview, w, h, url) {
        return {
            'og:image': preview,
            'og:type': 'video.other',
            'og:video:url': url,
            'og:video:type': 'text/html',
            'og:video:width': w,
            'og:video:height': h,
            'twitter:image': preview,
            'twitter:card': 'player',
            'twitter:player': url,
            'twitter:player:width': w,
            'twitter:player:height': h
        }
    }

    function youtubeMeta(vid) {
        const url = `https://www.youtube.com/embed/${vid}`;
        const purl = `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`;
        return ogVideo(purl, 960, 760, url);
    }

    try {
        if (new RegExp(YOUTUBE_REGEX).test(href)) {
            const vid = href.substring(href.indexOf('v=') + 2).split('&')[0];
            return youtubeMeta(vid);
        }
        else if (new RegExp(YOUTUBE_SHORT_REGEX).test(href)) {
            const vid = href.split('/')[3].split('?')[0];
            return youtubeMeta(vid);
        }
        else if (new RegExp(LBRY_REGEX).test(href)) {
            const vid = href.split('/')[href.indexOf('/@') > -1 ? 4 : 3];
            const lbryId = vid.split(':')[0];
            const url = `https://lbry.tv/$/embed/${lbryId}`;
            const { image } = await oembed(href);
            return ogVideo(image, 560, 315, url);
        }
    }
    catch (ex) {
        console.log(ex);
    }

    return {};
}

function getOEmbedHtml(href) {
    let insertHTML = undefined;
    let oembed = undefined;

    if (new RegExp(IMAGE_REGEX).test(href) ||
        (/https?:\/\/(www.)?tradingview.com\/x\//gi).test(href)) {
        // Images auto embed
        // Trading view chart image
        insertHTML = `<img src="${href}" alt="${href}" />`;
    }
    else if (new RegExp(LBRY_REGEX).test(href)) {
        //
        // Example links:
        // https://open.lbry.com/@ZombieDoll:7/ZombieDoll-2019-Highlights--Part-1:9?r=1Z8k5wHyemxALZDWqZzCbxcHavTnTfay
        // https://lbry.tv/Cat-on-High:e
        //
        oembed = href; // not a real OEMBED, special handled by server...
    }
    else if (/https?:\/\/(www.)?bitchute.com\/video\/[a-zA-Z0-9_-]+/ig.test(href)) {
        const vid = href.split('/')[4];
        insertHTML = `<iframe width="640" height="360" scrolling="no" frameborder="0" style="border: none;" src="https://www.bitchute.com/embed/${vid}/"></iframe>`;
    }
    else if (/http(s)?:\/\/d.tube\/(#!\/)?v\//gi.test(href)) {
        //
        // Cannot disable autoplay: https://github.com/dtube/embed/issues/37
        //
        //const [user, id] = href.substring(href.indexOf('v/') + 2).split('/');
        //insertHTML = `<iframe width="560" height="315" src="https://emb.d.tube/#!/${user}/${id}" autoplay="0" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    else if (/https?:\/\/siasky.net\/[a-zA-Z0-9-_]+/.test(href)) {
        insertHTML = `<video controls name="media"><source src="${href}" type="video/mp4"></video>`;
    }
    else if ((/t.me\/([a-zA-Z0-9_!@+]+)\/([a-zA-Z0-9]+)/gi).test(href)) {
        // Telegram
        const [, ids] = href.split('t.me/')
        if (ids) {
            insertHTML = `<span data-telegram-rn="${generateUuid()}" data-telegram-post="${ids}" data-width="100%"></span>`
        }
    }
    else if ((/https:\/\/(mobile.)?twitter.com\/[a-zA-Z0-9-_]+\/status\/[0-9]+/gi).test(href)) {
        // Twitter
        oembed = `https://publish.twitter.com/oembed?url=${href}`;
    }
    else if (new RegExp(YOUTUBE_REGEX).test(href) || new RegExp(YOUTUBE_SHORT_REGEX).test(href)) {
        // Youtube
        oembed = `https://www.youtube.com/oembed?format=json&url=${href.replace(/feature=(.*?)&/, '')}`;
    }
    else if ((/https?:\/\/www.instagr(am.com|.am)(\/[a-zA-Z0-9-_]+)?\/(p|tv|reel)\/[a-zA-Z0-9-_]+(\/?.+)?/gi).test(href)) {
        // Instagram
        oembed = `https://api.instagram.com/oembed/?url=${href}`;
    }
    else if ((/soundcloud/).test(href)) {
        // Sound Cloud
        oembed = `https://soundcloud.com/oembed?format=json&url=${href}`;
    }

    return { insertHTML, oembed };
}

(function () {

    // hijack the log function for logging to a string variable
    let log = console.log;
    console.enableProxyLog = function (value) {
        if (typeof window !== 'undefined') {
            window._consoleProxyEnabled = value;
            window.localStorage['proxyLog'] = value ? 'enabled' : '';
        }
    }

    console.proxyLog = function () {
        if (typeof window !== 'undefined' && window._consoleProxyEnabled) {
            const args = Array.from(arguments).map(a => JSON.stringify(a));
            window._consoleProxy = (window._consoleProxy || '') + [`[${new Date().toLocaleTimeString()}]`, ...args].join(' ') + '\r\n';
        }
    }
    console.log = function () {
        console.proxyLog.apply(this, arguments);
        log.apply(this, arguments);
    }

    if (typeof window !== 'undefined' && window.localStorage['proxyLog']) {
        console.enableProxyLog(true);
    }

})();

export {
    TIME_ENCODE_GENESIS,
    LINK_REGEX,
    IMAGE_REGEX,
    LBRY_REGEX,
    YOUTUBE_REGEX,
    YOUTUBE_SHORT_REGEX,
    Lock,
    getConfig,
    saveConfig,
    sanitize,
    htmlToMarkdown,
    htmlToText,
    markdownToHTML,
    generateUuid,
    waitFor,
    sleep,
    getFromCache,
    createDOMParser,
    getOEmbedHtml,
    getOEmbedMeta,
    getShortPublicKey
}