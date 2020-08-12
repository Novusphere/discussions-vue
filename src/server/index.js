import express, { Router } from 'express';
import expressSession from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import { argv } from 'yargs';
import { attachControllers } from '@decorators/express';
import { getConfig } from "@/novusphere-js/utility";

import createRoutes from "./routes";
import siteConfig from "./site";
import { connectDatabase } from "./mongo";
import services from "./services";
import gateways from "./gateways";

import AccountController from "./controllers/AccountController";
import BlockchainController from "./controllers/BlockchainController";
import DataController from "./controllers/DataController";
import ModerationController from "./controllers/ModerationController";
import SearchController from "./controllers/SearchController";
import UploadController from "./controllers/UploadController";


(async function () {
    if (!await connectDatabase()) return;

    // update our config
    if (argv.config) {
        console.log(`Updating site settings from config: ${argv.config}`);
        Object.assign(siteConfig, getConfig(argv.config));
    }

    const INDEX_FILE = fs.readFileSync(`./dist/index.html`, `utf8`);
    const BUILD_TIME = Date.now();

    const app = express();

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(expressSession({
        secret: 'this is open source so its not much of a secret huh',
        resave: false,
        saveUninitialized: true,
    }));

    async function serve(req, res) {
        const botRegex = new RegExp(siteConfig.botUserAgents.join('|'), 'i');
        const userAgent = req.get('user-agent');
        if (!userAgent || userAgent.match(botRegex) || req.query.rendertron) {
            const url = `${siteConfig.rendertron}/${siteConfig.url}${req.path}`;
            console.log(`[rendertron] ${userAgent} - ${siteConfig.url}${req.path}`);
            const { data } = await axios.get(url);
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Type', 'text/html');
            res.send(data);
        }
        else {
            const header = `<script>window.__BUILD__ = ${BUILD_TIME}</script>`;
            let index = INDEX_FILE;
            index = index.replace(/<\/head>/, `${header}</head>`);
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Type', 'text/html');
            res.send(index);
        }
    }

    function addRoute(route, path = '') {
        if (!route.children || route.redirect) {
            const fullPath = path + route.path;
            console.log(`Added route for ${fullPath}`);
            app.get(fullPath, async (req, res, next) => {
                serve(req, res, next);
            });
        }
        
        if (route.children) {
            for (const child of route.children) {
                let fullPath = path + route.path;
                if (fullPath[fullPath.length - 1] != '/') {
                    fullPath += '/';
                }
                addRoute(child, fullPath);
            }
        }
    }

    const routes = createRoutes();
    routes.forEach(r => addRoute(r));
    app.get(`/`, serve);

    const apiRouter = express.Router();
    attachControllers(apiRouter, [
        AccountController,
        BlockchainController,
        DataController,
        ModerationController,
        SearchController,
        UploadController]);

    app.use('/v1/api', cors(), apiRouter);

    app.use(express.static(`./dist/`));

    app.get('*', (req, res) => {
        res.status(404);
        res.redirect(`/404?path=${req.path}`);
    });

    //app.listen(siteConfig.port, () => console.log(`Server is listening at port ${siteConfig.port}`));
    gateways.start(app, siteConfig.port, () => console.log(`Gateway is listening at port ${siteConfig.port}`));
    services.start();
})();