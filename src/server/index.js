import express from 'express';
import fs from 'fs';
import { sleep, markdownToHTML, htmlToText } from "@/novusphere-js/utility";
import { getSinglePost, getCommunities, getUserProfile } from "@/novusphere-js/discussions/api";

const DEFAULT_TILE = `Discussions`;
const INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);
const BUILD_TIME = Date.now();

const app = express();
const port = 8008;

app.use(`/js`, express.static(`./dist/js`));
app.use(`/css`, express.static(`./dist/css`));
app.use(`/static`, express.static(`./dist/static`));

app.get(`/u/:who/:tab?`, async (req, res, next) => {
    const [, key] = req.params.who.split('-');
    if (key) {
        const info = await getUserProfile(key);
        if (info) {
            res.inject = {
                head: {
                    title: `Discussions - ${info.displayName}`,
                    description: `${key} - ${info.followers} followers, ${info.posts} posts, ${info.threads} threads`,
                    image: `https://atmosdb.novusphere.io/discussions/keyicon/${key}`
                }
            }
        }
    }
    next();
});

app.get(`/tag/:tags/:referenceId/:referenceId2?`, async (req, res, next) => {
    const post = await getSinglePost(req.params.referenceId);
    if (post) {
        res.inject = {
            head: {
                title: post.title ? `Discussions - ${post.title}` : DEFAULT_TILE,
                description: await post.getContentText({ removeImages: true }),
                image: await post.getContentImage()
            }
        }
    }
    next();
});

app.get(`/tag/:tags`, async (req, res, next) => {
    const tags = (req.params.tags || 'all').split(',');
    if (tags.length == 1) {
        const community = (await getCommunities()).find(c => c.tag == tags[0]);
        if (community) {
            res.inject = {
                head: {
                    title: `Discussions - #${tags[0]}`,
                    description: htmlToText(markdownToHTML(community.desc)),
                    image: community.icon
                }
            }
        }
    }
    next();
});

app.get('*', (req, res) => {

    // TO-DO: build default head from site.json
    let body = ``;
    let head = { title: DEFAULT_TILE, description: `An open forum for discussions built on blockchain. Supporting and nurturing token communities of all kind`, image: `https://i.imgur.com/WO5pb52.png` };

    if (res.inject) {
        body = res.inject.body || body;
        Object.assign(head, res.inject.head || {});
    }

    const header = `
        <title>${head.title}</title>
        <meta name="description" content="${head.description}"/>
        <meta property="og:title" content="${head.title}"/>
        <meta property="og:description" content="${head.description}"/>
        <meta property="og:image" content="${head.image}"/>
        <meta name="twitter:title" content="${head.title}">
        <meta name="twitter:description" content="${head.description}">
        <meta name="twitter:image" content="${head.image}">
        <meta name="twitter:card" content="summary_large_image">
        <script>window.__BUILD__ = ${BUILD_TIME}</script>
    `;

    let index = INDEX_FILE;
    index = index.replace(/<title>[A-Za-z0-9_-\s]+?<\/title>/, ``); // strip title
    index = index.replace(/<\/head>/, `${header}</head>`);
    index = index.replace(/<\/div>/, `${body}</div>`); // should be the app div

    res.setHeader('content-type', 'text/html');
    res.send(index);
});

app.listen(port, () => console.log(`Server is listening at port ${port}`));