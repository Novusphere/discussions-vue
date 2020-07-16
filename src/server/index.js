import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as rendertron from 'rendertron-middleware';
import fs from 'fs';
import { argv } from 'yargs';
import { attachControllers } from '@decorators/express';
import { getConfig } from "@/novusphere-js/utility";

import createRoutes from "./routes";
import siteConfig from "./site";
import { connectDatabase, getDatabase } from "./mongo";
import services from "./services";

import AccountController from "./controllers/AccountController";
import BlockchainController from "./controllers/BlockchainController";
import DataController from "./controllers/DataController";
import ModerationController from "./controllers/ModerationController";
import SearchController from "./controllers/SearchController";
import UploadController from "./controllers/UploadController";


(async function () {
    if (!await connectDatabase()) return;

    // update our config
    (function () {
        if (argv.config) {
            console.log(`Updating site settings from config: ${argv.config}`);
            Object.assign(siteConfig, getConfig(argv.config));
        }
    })();

    const INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);
    const BUILD_TIME = Date.now();

    const app = express();
    const rendertronService = rendertron.makeMiddleware({
        proxyUrl: siteConfig.rendertron,
    });

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.use(`/js`, express.static(`./dist/js`));
    app.use(`/css`, express.static(`./dist/css`));
    app.use(`/static`, express.static(`./dist/static`));

    function serve(req, res) {
        const botRegex = new RegExp(siteConfig.botUserAgents.join('|'), 'i');
        if (req.get('user-agent').match(botRegex)) {
            rendertronService(req, res, next);
        }
        else {
            const header = `
            <script>window.__BUILD__ = ${BUILD_TIME}</script>`;

            let index = INDEX_FILE;
            index = index.replace(/<\/head>/, `${header}</head>`);
            res.setHeader('content-type', 'text/html');
            res.send(index);
        }
    }

    function addRoute(route, path = '') {
        if (!route.children) {
            const fullPath = path + route.path;
            console.log(`Added route for ${fullPath}`);
            app.get(fullPath, async (req, res, next) => {
                serve(req, res);
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

    const apiRouter = express.Router();
    attachControllers(apiRouter, [
        AccountController,
        BlockchainController,
        DataController,
        ModerationController,
        SearchController,
        UploadController]);

    app.use('/v1/api', cors(), apiRouter);

    app.get('*', (req, res) => {
        // TO-DO: 404
        serve(req, res);
    });

    app.listen(siteConfig.port, () => console.log(`Server is listening at port ${siteConfig.port}`));
    services.start();

})();