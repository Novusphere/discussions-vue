import express from 'express';
import fs from 'fs';
import { argv } from 'yargs';
import createRoutes from "./routes";

(function () {

    let CONFIG = undefined;
    try {
        CONFIG = JSON.parse(fs.readFileSync(argv.config));
    }
    catch (ex) {
        console.error(ex);
        return;
    }

    const INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);
    const BUILD_TIME = Date.now();

    const app = express();

    app.use(`/js`, express.static(`./dist/js`));
    app.use(`/css`, express.static(`./dist/css`));
    app.use(`/static`, express.static(`./dist/static`));

    function addRoute(route, path = '') {
        if (!route.children) {
            const fullPath = path + route.path;
            console.log(`Added route for ${fullPath}`);
            app.get(fullPath, async (req, res, next) => {
                const meta = route.meta;
                if (meta) {
                    let inject = {};
                    if (meta.head) {
                        inject.head = await meta.head(req.params);
                    }
                    res.inject = inject;
                }
                next();
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

        // TO-DO: build default head from site.json
        let body = ``;
        let head = { title: CONFIG.title, description: CONFIG.description, image: CONFIG.image };

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

    app.listen(CONFIG.port, () => console.log(`Server is listening at port ${CONFIG.port}`));

})();