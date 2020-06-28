import express from 'express';
import fs from 'fs';
import { sleep } from "@/novusphere-js/utility";
import { getSinglePost } from "@/novusphere-js/discussions/api";

const app = express();
const port = 8008;

app.use(`/js`, express.static(`./dist/js`));
app.use(`/css`, express.static(`./dist/css`));

app.get(`/tag/:tags/:referenceId/:referenceId2?`, async (req, res, next) => {
    const post = await getSinglePost(req.params.referenceId);
    res.inject = {
        body: JSON.stringify(post)
    }
    next();
});

app.get('*', (req, res) => {
    let index = fs.readFileSync(`./dist/index.html`, `utf8`);

    let title = ``;
    let body = ``;
    let head = ``;

    if (res.inject) {
        title = res.inject.title || title;
        body = res.inject.body || body;
        head = res.inject.header || head;
    }

    index = index.replace(/<title>[A-Za-z0-9_-\s]+?<\/title>/, `<title>Discussions${title ? (' - ' + title) : ''}</title>`);
    index = index.replace(/<\/head>/, `${head}</head>`);
    index = index.replace(/<\/div>/, `${body}</div>`); // should be the app div

    res.setHeader('content-type', 'text/html');
    res.send(index);
});

app.listen(port, () => console.log(`Server is listening at port ${port}`));