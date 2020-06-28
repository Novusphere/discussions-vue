import Showdown from "showdown";
import Turndown from "turndown";
import sanitizeHTML from "sanitize-html";
import { uuid } from "uuidv4";
import loadTelegram from "./telegram";

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

function generateUuid() {
    return uuid();
}

function refreshOEmbed() {
    setTimeout(() => {
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

    }, 100);
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

export {
    htmlToMarkdown,
    markdownToHTML,
    generateUuid,
    refreshOEmbed,
    waitFor,
    sleep,
    getFromCache,
    createDOMParser
}