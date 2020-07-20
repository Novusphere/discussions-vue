import { getConfig, saveConfig, sleep, generateUuid } from "@/novusphere-js/utility";
import { brainKeyToKeys } from "@/novusphere-js/uid";
import { submitPost } from "@/novusphere-js/discussions/api";

const Twitter = require('twitter');

(async function () {
    try {
        const PRIMARY_TAG = "twitter";
        const DELAY_DURATION = 5 * 60 * 1000; // 5 minutes -- how often we post a tweet

        const config = await getConfig('twitter', {
            key: '',
            options: {},
            watch: [],
        });

        const twitterState = await getConfig('twitter-state', {});

        if (!config.key) throw new Error(`Bot mnemonic brain key is not configured`);
        if (!config.options.consumer_key) throw new Error(`Twitter options/authentication is not configured`);

        const keys = await brainKeyToKeys(config.key);
        const client = new Twitter(config.options);

        // TO-DO: wrap in infinite loop
        for (const w of config.watch) {
            console.log(`Checking ${w.screen_name} for new tweets...`);

            const { since_id } = twitterState[w.screen_name] || {};

            const tweets = await client.get('statuses/user_timeline', {
                screen_name: `@${w.screen_name}`,
                count: 1,
                since_id: since_id,
                exclude_replies: true,
                include_rts: false,
                tweet_mode: 'extended'
            });

            if (tweets.length <= 0) {
                console.log(`No new tweets`);
            }
            else {

                console.log(`Found ${tweets.length} new tweets`);

                // we reverse the tweets to itterate from oldest to newest
                for (const tweet of tweets.reverse()) {

                    const { id_str, user: { screen_name }, retweeted_status, entities: { hashtags, /*user_mentions*/ } } = tweet;
                    if (retweeted_status) continue; // ignore retweets

                    const url = `https://twitter.com/${screen_name}/status/${id_str}`;
                    const tags = Array.from(new Set([PRIMARY_TAG, "twitter", ...hashtags.map(({ text }) => text), ...(w.tags || [])])).map(t => t.toLowerCase());
                    //const screen_names = user_mentions.map(({ screen_name }) => screen_name);

                    const uuid = generateUuid();
                    const post = {
                        title: '',
                        displayName: `${screen_name}`,
                        content: `${url} \n\n ${tags.map(t => `[#${t}](/tag/${t})`).join(' ')}`,
                        uuid: uuid,
                        threadUuid: uuid,
                        parentUuid: "",
                        tags: tags,
                        mentions: [],
                        uidw: keys.wallet.pub,
                        sub: tags[0],
                        edit: false
                    };

                    console.log(`Posting ${url} ... ${new Date()}`);

                    const trxid = await submitPost(keys.arbitrary.key, post, []);

                    console.log(trxid);

                    twitterState[w.screen_name] = {
                        ...twitterState[w.screen_name],
                        since_id: id_str,
                        since_url: url,
                        since_trxid: trxid
                    }

                    await saveConfig('twitter-state', twitterState);
                    await sleep(DELAY_DURATION);
                }
            }

            await sleep(1000); // take a short break
        }
    }
    catch (ex) {
        console.log(ex);
    }

})();