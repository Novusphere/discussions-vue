import { getCommunities } from "@/novusphere-js/discussions/api";
import { getConfig } from "@/novusphere-js/utility";
import { argv } from 'yargs';
import VueRouterSitemap from 'vue-router-sitemap';
import path from 'path';
import createRoutes from "./routes";
import siteConfig from "./site";

if (argv.config) {
    console.log(`Updating site settings from config: ${argv.config}`);
    Object.assign(siteConfig, getConfig(argv.config));
}

function unwindRoutes(routes, basePath = '') {
    let result = [];

    for (const { path, children } of routes) {
        if (!children) {
            const fp = `${basePath}${path}`;
            if (fp.indexOf(':') == -1 && fp.indexOf('/tests') != 0)
                result.push({ path: fp });
        }
        else {
            let p = path;
            if (p.lastIndexOf('/') != p.length - 1)
                p += '/';
            result.push(...unwindRoutes(children, `${basePath}${p}`));
        }
    }

    return result;
}

(async function () {
    const communities = await getCommunities();

    const routes = unwindRoutes(createRoutes());
    routes.push(...communities.map(comm => ({ path: `/tag/${comm.tag}` })));
    console.log(routes);

    const staticSitemap = path.resolve('./public/', 'sitemap.xml');
    new VueRouterSitemap({ options: { routes } })
        .build(siteConfig.url)
        .save(staticSitemap);

    console.log(`${staticSitemap} created`);

})();