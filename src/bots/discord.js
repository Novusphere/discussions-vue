import Discord from 'discord.js';
import { searchPostsByAll } from "@/novusphere-js/discussions/api";
import { getConfig, saveConfig, sleep } from "@/novusphere-js/utility";

(async function () {

    const BOT_NAME = `discord`;
    const RESET_DURATION = 2 * 60 * 60 * 1000; // 2 hours -- how long until we reset the bot
    const SLEEP_DURATION = 10 * 1000; // 10 seconds -- how often we do our process loop
    const DELAY_DURATION = 5 * 60 * 1000; // 5 minutes -- how often we send a discord message

    let lastSentDiscordMsgTime = 0;

    console.log(`===== Discussions.app Discord Bot =====`);
    console.log(`Loading config...`);

    const config = getConfig(BOT_NAME, {
        "token": "",
        "lastPostTime": 0,
        "ignoreTags": ["test"],
        "channel": "discussions"
    });

    if (!config.token) {
        console.error(`Discord API token is unspecified`);
        return;
    }

    function login(bot) {
        return new Promise((resolve, reject) => {
            bot.on('ready', () => {
                resolve(bot);
            });
            /*bot.on("debug", (e) => {
                console.log(e)
            });*/
            bot.on("error", (e) => {
                console.error(e);
                reject(e);
            });

            bot.login(config.token);
        });
    }

    async function getNewPosts() {
        const cursor = searchPostsByAll(config.ignoreTags);
        cursor.pipeline[0].$match.createdAt = { $gt: config.lastPostTime };
        cursor.pipeline.push({ // non-standard sort option
            $sort: {
                createdAt: 1 // ascending
            }
        });
        cursor.limit = 1; // only get one post at a time, since we only want to send one post every so often...

        const posts = await cursor.next();
        return posts;
    }

    for (;;) {

        console.log('Trying to log in...');
        const bot = await login(new Discord.Client());
        console.log('Logged in!');

        for (let q = 0; q < (RESET_DURATION / SLEEP_DURATION); q++) {
            try {
                const now = Date.now();
                if (now - lastSentDiscordMsgTime > DELAY_DURATION) {
                    console.log(`Checking for new posts at ${new Date().toLocaleString()}`);

                    const posts = await getNewPosts();

                    for (let i = 0; i < posts.length; i++) {
                        const p = posts[i];

                        // this is mainly just a precaution, but it should never occur
                        if (p.createdAt.getTime() <= config.lastPostTime) break;

                        //const time = p.createdAt.toLocaleString("en-US", { timeZone: 'UTC' });
                        const tags = p.tags.map(t => `#${t}`).join(', ');
                        const content = await p.getContentText({ removeImages: true });
                        const links = (await p.getContentDocument()).links;

                        let url = `https://discussions.app/tag/${p.sub}/${p.getEncodedId()}/${p.getSnakeCaseTitle()}`;
                        let message = undefined;
                        if (links && links.length > 0 && content.length < 300) {
                            // let discord embed/preview the link, instead of our post
                            message = `**${p.displayName}**: <${url}>\n${tags}\n\n${content}`;
                        }
                        else {
                            message = `**${p.displayName}**: ${url}\n${tags}\n\n`;
                        }

                        console.log(message);

                        const channel = bot.channels.cache.find(ch => ch.name == config.channel);
                        if (!channel) {
                            console.error(`Discord channel "${config.channel}" was not found`);
                            return;
                        }
                        await channel.send(message);

                        lastSentDiscordMsgTime = now;
                    }

                    if (posts.length > 0 && posts[0].createdAt.getTime() > config.lastPostTime) {
                        config.lastPostTime = posts[0].createdAt.getTime();
                        saveConfig(BOT_NAME, config);
                    }
                }
            }
            catch (ex) {
                console.error(ex);
            }

            await sleep(SLEEP_DURATION);
        }

        console.log(`Resetting bot...`);
        bot.destroy();
        await sleep(5000);
    }

})();