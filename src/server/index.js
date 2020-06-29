import express from 'express';
import fs from 'fs';
import { sleep, markdownToHTML, htmlToText } from "@/novusphere-js/utility";
import { getSinglePost, getCommunities } from "@/novusphere-js/discussions/api";

const DEFAULT_TILE = `Discussions`;
const INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);

const app = express();
const port = 8008;

app.use(`/js`, express.static(`./dist/js`));
app.use(`/css`, express.static(`./dist/css`));

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

            console.log(res.inject.head);
        }
    }
    next();
});

app.get('*', (req, res) => {

    let title = ``;
    let body = ``;
    let head = { title: DEFAULT_TILE, description: ``, image: `` };

    if (res.inject) {
        title = res.inject.title || title;
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
    `;

    let index = INDEX_FILE;
    index = index.replace(/<title>[A-Za-z0-9_-\s]+?<\/title>/, ``); // strip title
    index = index.replace(/<\/head>/, `${header}</head>`);
    index = index.replace(/<\/div>/, `${body}</div>`); // should be the app div

    res.setHeader('content-type', 'text/html');
    res.send(index);
});

app.listen(port, () => console.log(`Server is listening at port ${port}`));