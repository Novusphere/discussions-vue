import Showdown from "showdown";
import Turndown from "turndown";
import sanitizeHTML from "sanitize-html";
import fs from 'fs';
import { uuid } from "uuidv4";
import loadTelegram from "./telegram";
import Lock from "./lock";

// Posts Ids are encoded with the first 32 bits being from the transaction id, and then following 16 bits from the time offset
const TIME_ENCODE_GENESIS = 1483246800000 // 2017-1-1
const IMAGE_REGEX = (/(.|)http[s]?:\/\/(\w|[:/.%-])+\.(png|jpg|jpeg|gif)(\?(\w|[:/.%-])+)?(.|)/gi);
const LINK_REGEX = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/gi);

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

// kind of hacky, but... such is life
const _oembedMaxAttempt = 10;
let _oembedAttempts = _oembedMaxAttempt;
let _oembedNextAttempt = 0;
(async function _refreshOEmbed() {
    for (; ;) {
        const now = Date.now();
        if (_oembedAttempts < _oembedMaxAttempt && now >= _oembedNextAttempt) {
            _oembedNextAttempt = now + 1000;
            _oembedAttempts++;

            if (window.FB) {
                window.FB.XFBML.parse()
            }

            if (window.twttr) {
                window.twttr.widgets.load()
            }

            if (window.instgrm) {
                window.instgrm.Embeds.process()
            }

            loadTelegram(window);

            const relativeAnchors = Array.from(document.querySelectorAll(`a:not([class])`))
                .map((a) => ({ a, href: a.getAttribute('href') }))
                .filter(({ href }) => href && (href.indexOf('/') == 0 || href.indexOf('discussions.app/') > -1));

            relativeAnchors.forEach(({ a, href }) => {

                // turn into relative
                if (href.indexOf('/') != 0) {
                    href = href.substring(href.indexOf('/', href.indexOf('//') + 2));
                    a.setAttribute('href', href);
                }

                a.setAttribute('class', '_');
                a.addEventListener('click', (e) => {
                    if (window.$vue) {
                        e.preventDefault();
                        e.stopPropagation();

                        window.$vue.$router.push(href);
                    }
                });
            });

            /*const tagAnchors = relativeAnchors.filter(({ href }) => href.indexOf('/tag/') == 0);
            const userAnchors = relativeAnchors.filter(({ href }) => href.indexOf('/u/') == 0);

            tagAnchors.forEach(({ a, href }) => {
                a.setAttribute('class', '_');
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tags = href.split('/').filter(s => s)[1];
                    if (tags) {
                        console.log(tags);
                    }
                });
            });

            userAnchors.forEach(({ a, href }) => {
                a.setAttribute('class', '_');
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const user = href.split('/').filter(s => s)[1];
                    if (user) {
                        let [displayName, publicKey] = user.split('-');
                        console.log(`${displayName} ${publicKey}`);
                    }
                });
            });*/

        }
        await sleep(100);
    }
})();

function refreshOEmbed() {
    _oembedAttempts = 0; // reset
    _oembedNextAttempt = 0; // schedule immediately
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

function getOEmbedHtml(href) {
    let insertHTML = undefined;
    let oembed = undefined;

    if (new RegExp(IMAGE_REGEX).test(href) ||
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
    Lock,
    getConfig,
    saveConfig,
    htmlToMarkdown,
    htmlToText,
    markdownToHTML,
    generateUuid,
    refreshOEmbed,
    waitFor,
    sleep,
    getFromCache,
    createDOMParser,
    getOEmbedHtml
}