import Showdown from "showdown";
import Turndown from "turndown";
import sanitizeHTML from "sanitize-html";
import { uuid } from "uuidv4";
import loadTelegram from "./telegram";
import fs from 'fs';

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
    for (;;) {
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
        } 
        await sleep(100);
    }
})();

function refreshOEmbed() {
    _oembedAttempts = 0; // reset
    _oembedNextAttempt = 0; // schedule immediately
}

function waitFor(predicate, sleep = 5, timeOut) {
    let waited = 0;
    return new Promise((resolve, reject) => {
        async function attempt() {
            if (await predicate()) resolve();
            else if (timeOut && waited >= timeOut) return reject();
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

function getBotsConfig(name) {
    const bots = JSON.parse(fs.readFileSync('./bots.json', 'utf8'));
    const section = bots[name] || {};
    const fn = `./bots/${name}.json`;
    if (fs.existsSync(fn)) {
        const config = JSON.parse(fs.readFileSync(fn));
        Object.assign(section, config);
    }
    return section;
}

function saveBotsConfig(name, config) {
    const bots = JSON.parse(fs.readFileSync('./bots.json', 'utf8'));
    const section = bots[name] || {};
    for (const key of Object.keys(config)) {
        if (key.indexOf('_') == 0) continue;
        section[key] = config[key];
    }
    bots[name] = section;
    fs.writeFileSync('./bots.json', JSON.stringify(bots));
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
    getBotsConfig,
    saveBotsConfig,
    htmlToMarkdown,
    htmlToText,
    markdownToHTML,
    generateUuid,
    refreshOEmbed,
    waitFor,
    sleep,
    getFromCache,
    createDOMParser
}