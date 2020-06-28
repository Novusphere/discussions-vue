import express from 'express';
import fs from 'fs';
import { sleep } from "@/novusphere-js/utility";
import { getSinglePost } from "@/novusphere-js/discussions/api";

const DEFAULT_TILE = `Discussions`;

const app = express();
const port = 8008;

app.use(`/js`, express.static(`./dist/js`));
app.use(`/css`, express.static(`./dist/css`));

app.get(`/tag/:tags/:referenceId/:referenceId2?`, async (req, res, next) => {
    const post = await getSinglePost(req.params.referenceId);
    if (post) {
        res.inject = {
            body: JSON.stringify(post),
            head: {
                title: post.title ? `Discussions - ${post.title}` : DEFAULT_TILE,
                description: await post.getContentText({ removeImages: true }),
                image: await post.getContentImage()
            }
        }
    }
    next();
});

app.get('*', (req, res) => {
    let index = fs.readFileSync(`./dist/index.html`, `utf8`);

    let title = ``;
    let body = ``;
    let head = { title: DEFAULT_TILE };

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
        <meta name="twitter:description" content="$${head.description}">
        <meta name="twitter:image" content="${head.image}">
        <meta name="twitter:card" content="summary_large_image">
    `;

    console.log(head);

    index = index.replace(/<title>[A-Za-z0-9_-\s]+?<\/title>/, ``); // strip title
    index = index.replace(/<\/head>/, `${head}</head>`);
    index = index.replace(/<\/div>/, `${body}</div>`); // should be the app div

    res.setHeader('content-type', 'text/html');
    res.send(index);
});

app.listen(port, () => console.log(`Server is listening at port ${port}`));