import express from 'express';
import fs from 'fs';
import { argv } from 'yargs';
import createRoutes from "./routes";
import config from "./site";

(function () {

    const INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);
    const BUILD_TIME = Date.now();

    const app = express();

    app.use(`/js`, express.static(`./dist/js`));
    app.use(`/css`, express.static(`./dist/css`));
    app.use(`/static`, express.static(`./dist/static`));

    function serve(res, head, body) {
        let _head = { title: config.title, description: config.description, image: config.image };
        if (head) {
            Object.assign(_head, head);
        }

        const header = `
        <title>${_head.title}</title>
        <meta name="description" content="${_head.description}"/>
        <meta property="og:title" content="${_head.title}"/>
        <meta property="og:description" content="${_head.description}"/>
        <meta property="og:image" content="${_head.image}"/>
        <meta name="twitter:title" content="${_head.title}">
        <meta name="twitter:description" content="${_head.description}">
        <meta name="twitter:image" content="${_head.image}">
        <meta name="twitter:card" content="summary_large_image">
        <script>window.__BUILD__ = ${BUILD_TIME}</script>`;

        let index = INDEX_FILE;
        index = index.replace(/<title>[A-Za-z0-9_-\s]+?<\/title>/, ``); // strip title
        index = index.replace(/<\/head>/, `${header}</head>`);
        if (body) {
            index = index.replace(/<\/div>/, `${body}</div>`); // should be the app div
        }
        res.setHeader('content-type', 'text/html');
        res.send(index);
    }

    function addRoute(route, path = '') {
        if (!route.children) {
            const fullPath = path + route.path;
            console.log(`Added route for ${fullPath}`);
            app.get(fullPath, async (req, res, next) => {
                const meta = route.meta;
                let head = undefined;
                let body = undefined;
                if (meta) {
                    const context = meta.context ? (await meta.context(req.params)) : undefined;
                    if (meta.head) {
                        head = await meta.head(context);
                    }
                }
                serve(res, head, body);
            });
        }
        else {
            for (const child of route.children) {
                let fullPath = path + route.path;
                if (fullPath[fullPath.length - 1] != '/') {
                    fullPath += '/';
                }
                addRoute(child, fullPath);
            }
        }
    }

    // hook up all our routes
    createRoutes().forEach(r => addRoute(r));

    app.get('*', (req, res) => {
        // TO-DO: 404
        serve(res);
    });

    app.listen(config.port, () => console.log(`Server is listening at port ${config.port}`));

})();