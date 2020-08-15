import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter);

import BlankPage from '@/pages/BlankPage';
import LogOutPage from "@/pages/LogOutPage";
import HomePage from "@/pages/HomePage";

import SubmitPostPage from "@/pages/SubmitPostPage";
import UserProfilePage from "@/pages/UserProfilePage";
import BrowseSearchPage from "@/pages/BrowseSearchPage";
import BrowseFeedPage from "@/pages/BrowseFeedPage";
import BrowseThreadPage from "@/pages/BrowseThreadPage";
import BrowseTrendingPostsPage from "@/pages/BrowseTrendingPostsPage";
import BrowseTagPostsPage from "@/pages/BrowseTagPostsPage";

import DiscoverPage from "@/pages/discover/DiscoverPage";
import DiscoverUserPage from "@/pages/discover/DiscoverUserPage";
import DiscoverCommunityPage from "@/pages/discover/DiscoverCommunityPage";

import NotificationsPage from "@/pages/notifications/NotificationsPage";
import BrowsePostNotificationsPage from "@/pages/notifications/BrowsePostNotificationsPage";
import BrowseTrxNotificationsPage from "@/pages/notifications/BrowseTrxNotificationsPage";

import SettingsPage from "@/pages/settings/SettingsPage";
import ContentSettingsPage from "@/pages/settings/ContentSettingsPage";
import BrowseWatchedThreadsPage from "@/pages/settings/BrowseWatchedThreadsPage";
import BrowseModeratedPostsPage from "@/pages/settings/BrowseModeratedPostsPage";
import KeysSettingsPage from "@/pages/settings/KeysSettingsPage";

import WalletPage from "@/pages/wallet/WalletPage";
import WalletAssetsPage from "@/pages/wallet/WalletAssetsPage";
import WalletWithdrawPage from "@/pages/wallet/WalletWithdrawPage";
import WalletDepositPage from "@/pages/wallet/WalletDepositPage";
import EOSAccountCreatePage from "@/pages/wallet/EOSAccountCreatePage";

import TestsPage from "@/pages/tests/TestsPage";
import TestEditorPage from '@/pages/tests/TestEditorPage';
import TestBrowsePostsPage from '@/pages/tests/posts/TestBrowsePostsPage';

import MissingPage from "@/pages/MissingPage";

let components = {
    BlankPage,
    LogOutPage,
    HomePage,
    SubmitPostPage,
    UserProfilePage,
    BrowseSearchPage,
    BrowseFeedPage,
    BrowseThreadPage,
    BrowseTrendingPostsPage,
    BrowseTagPostsPage,
    DiscoverPage,
    DiscoverUserPage,
    DiscoverCommunityPage,
    NotificationsPage,
    BrowsePostNotificationsPage,
    BrowseTrxNotificationsPage,
    SettingsPage,
    ContentSettingsPage,
    BrowseWatchedThreadsPage,
    BrowseModeratedPostsPage,
    KeysSettingsPage,
    WalletPage,
    WalletAssetsPage,
    WalletWithdrawPage,
    WalletDepositPage,
    EOSAccountCreatePage,
    TestsPage,
    TestEditorPage,
    TestBrowsePostsPage,
    MissingPage
}

import createRoutes from "@/server/routes";
import site from "@/server/site";
const routes = createRoutes(components);

const router = new VueRouter({
    mode: 'history',
    routes
});

router.beforeEach((to, from, next) => {
    console.proxyLog(`Route change from ${from.path} to ${to.path}`);
    next();
});

router.afterEach(async (to) => {

    const $vue = window.$vue;
    if ($vue && $vue.$store) {
        $vue.$store.commit("setPopoverOpen", {
            value: false,
            type: "profile",
        });
        $vue.$store.commit("setPopoverOpen", {
            value: false,
            type: "tag",
        });
    }

    let head = {
        title: site.title,
        description: site.description,
        image: `${site.url}${site.image}`
    };

    function stripUndefined(obj) {
        Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
    }

    const meta = to.meta;
    if (meta) {
        try {
            const context = meta.context ? (await meta.context(to.params)) : undefined;

            if (meta.head) {
                let _head = await meta.head(context);
                if (_head) {
                    // removed undefined
                    stripUndefined(_head);
                    Object.assign(head, _head);
                }
            }
        }
        catch (ex) {
            console.log(ex);
        }
    }


    console.log(head);

    document.title = head.title;
    setMeta("og:title", head.title);
    setMeta("twitter:title", head.title);

    setMeta("description", head.description);
    setMeta("og:description", head.description);
    setMeta("twitter:description", head.description);

    setMeta("og:image", head.image);
    setMeta("twitter:image", head.image);

    if (head.meta) {
        stripUndefined(head.meta);

        console.log(head.meta);

        for (const name in head.meta) {
            const content = head.meta[name];
            setMeta(name, content);
        }
    }
});

function setMeta(name, content) {
    const node = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    if (node) {
        node.setAttribute("content", content);
    }
}

export default router;