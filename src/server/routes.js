import { getSinglePost, getCommunityByTag, getUserProfile, getAPIHost } from "@/novusphere-js/discussions/api";

const routes = [
    {
        path: '/',
        redirect: '/home',
        component: `BlankPage`,
        children: [
            { path: `home`, component: `HomePage` },
            { path: '404', component: 'MissingPage', meta: { head: async () => ({ title: `Discussions - 404` }) } },
            { path: 'submit', component: `SubmitPostPage` },
            { path: 'logout', component: `LogOutPage` },
            { path: 'feed', component: `BrowseFeedPage`, meta: { head: async () => ({ title: `Discussions - Feed` }) } },
            { path: 'search', component: `BrowseSearchPage` },
            { path: 'tag/all', component: `BrowseTrendingPostsPage`, meta: { head: async () => ({ title: `Discussions - Trending`, description: `View trending posts on Discussions.app` }) } },
            { path: 'tag/:tags/submit', component: `SubmitPostPage` },
            {
                path: 'tag/:tags/:referenceId/:title?/:referenceId2?',
                component: `BrowseThreadPage`,
                meta: {
                    context: async (p) => {
                        const post = await getSinglePost(p.referenceId);
                        return post;
                    },
                    head: async (post) => {
                        return ({
                            title: `Discussions - ${post.title ? post.title : 'Viewing Thread'}`,
                            description: await post.getContentText({ removeImages: true }),
                            image: await post.getContentImage(),
                            meta: post.getMeta()
                        });
                    }
                }
            },
            {
                path: 'tag/:tags',
                component: `BrowseTagPostsPage`,
                meta: {
                    context: async (p) => {
                        const tags = (p.tags || 'all').split(',');
                        if (tags.length == 1) {
                            const community = await getCommunityByTag(tags[0]);
                            return community;
                        }
                        return undefined;
                    },
                    head: async (community) => {
                        return ({
                            title: `Discussions - #${community.tag}`,
                            description: community.description,
                            image: community.icon
                        })
                    }
                }
            },
            {
                path: 'u/:who/:tab?',
                component: `UserProfilePage`,
                meta: {
                    context: async (p) => {
                        const [, key] = p.who.split('-');
                        if (key) {
                            return await getUserProfile(key);
                        }
                        return undefined;
                    },
                    head: async (info) => {
                        if (!info.displayName) return undefined;
                        return ({
                            title: `Discussions - ${info.displayName}`,
                            description: `${info.pub} - ${info.followers} followers, ${info.posts} posts, ${info.threads} threads`,
                            image: `${await getAPIHost()}/v1/api/data/keyicon/${info.pub}.png`
                        });
                    }
                }
            },
            {
                path: 'notifications',
                component: `NotificationsPage`,
                redirect: `/notifications/posts`,
                children: [
                    { path: 'posts', component: `BrowsePostNotificationsPage`, meta: { head: async () => ({ title: `Discussions - Notifications - Posts` }) } },
                    { path: 'trx', component: `BrowseTrxNotificationsPage`, meta: { head: async () => ({ title: `Discussions - Notifications - Transactions` }) } },
                ]
            },
            {
                path: 'discover',
                component: `DiscoverPage`,
                redirect: `/discover/community`,
                children: [
                    { path: 'community', component: `DiscoverCommunityPage`, meta: { head: async () => ({ title: `Discussions - Discover Communities`, description: `Discover communities on Discussions.app` }) } },
                    { path: 'user', component: `DiscoverUserPage`, meta: { head: async () => ({ title: `Discussions - Discover Users`, description: `Discover users on Discussions.app` }) } },
                ]
            },
            {
                path: 'wallet',
                component: `WalletPage`,
                redirect: `/wallet/assets`,
                children: [
                    { path: 'assets', component: `WalletAssetsPage`, meta: { head: async () => ({ title: `Discussions - Wallet - Assets` }) } },
                    { path: 'withdraw', component: `WalletWithdrawPage`, meta: { head: async () => ({ title: `Discussions - Wallet - Withdraw` }) } },
                    { path: 'deposit', component: `WalletDepositPage`, meta: { head: async () => ({ title: `Discussions - Wallet - Deposits` }) } },
                    { path: 'eos-account', component: `EOSAccountCreatePage`, meta: { head: async () => ({ title: `Discussions - Wallet - EOS Account Creation` }) } }
                ]
            },
            {
                path: 'settings',
                redirect: `/settings/content`,
                component: `SettingsPage`,
                children: [
                    { path: 'content', component: `ContentSettingsPage`, meta: { head: async () => ({ title: `Discussions - Settings - Content` }) } },
                    { path: 'watched', component: `BrowseWatchedThreadsPage`, meta: { head: async () => ({ title: `Discussions - Settings - Watched Threads` }) } },
                    { path: 'moderated/:tag', component: "BrowseModeratedPostsPage", meta: { head: async () => ({ title: `Discussions - Settings - Moderated Posts` }) } },
                    { path: 'keys', component: `KeysSettingsPage`, meta: { head: async () => ({ title: `Discussions - Settings - Keys` }) } }
                ]
            }
        ]
    },
    {
        path: '/tests',
        component: `BlankPage`,
        children: [
            {
                path: '',
                component: `TestsPage`,
            },
            {
                path: 'editor',
                component: `TestEditorPage`
            },
            {
                path: 'posts',
                component: `BlankPage`,
                children: [
                    {
                        path: 'browse/:transactionIds',
                        component: `TestBrowsePostsPage`
                    }
                ]
            }
        ]
    }
]

function createRoute(route, components) {
    let result = { ...route };
    if (result.component && components) {
        const component = components[result.component];
        if (!components) throw new Error(`Component ${result.component} was not found in specified components`);
        result.component = component;
    }
    if (result.children) {
        result.children = result.children.map(chr => createRoute(chr, components));
    }
    return result;
}

export default function (components) {
    return routes.map(r => createRoute(r, components));
}