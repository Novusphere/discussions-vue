import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter);

import BlankPage from '@/pages/BlankPage';
import LogOutPage from "@/pages/LogOutPage";

import SubmitPostPage from "@/pages/SubmitPostPage";
import UserProfilePage from "@/pages/UserProfilePage";
import CommunityPage from "@/pages/CommunityPage";
import BrowseSearchPage from "@/pages/BrowseSearchPage";
import BrowseFeedPage from "@/pages/BrowseFeedPage";
import BrowseThreadPage from "@/pages/BrowseThreadPage";
import BrowseTrendingPostsPage from "@/pages/BrowseTrendingPostsPage";
import BrowseTagPostsPage from "@/pages/BrowseTagPostsPage";
import BrowseNotifications from "@/pages/BrowseNotifications";

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

let components = {
    BlankPage,
    LogOutPage,
    SubmitPostPage,
    UserProfilePage,
    CommunityPage,
    BrowseSearchPage,
    BrowseFeedPage,
    BrowseThreadPage,
    BrowseTrendingPostsPage,
    BrowseTagPostsPage,
    BrowseNotifications,
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
    TestBrowsePostsPage
}

import createRoutes from "@/server/routes";
import site from "@/server/site";
const routes = createRoutes(components);

const router = new VueRouter({
    mode: 'history',
    routes
})

router.beforeEach((to, from, next) => {
    console.proxyLog(`Route change from ${from.path} to ${to.path}`);
    next();
});

router.afterEach(async (to) => {
    const meta = to.meta;
    if (meta) {
        try {
            const context = meta.context ? (await meta.context(to.params)) : undefined;

            let head = {};
            if (meta.head) {
                head = await meta.head(context);
            }

            head.title = head.title || site.title;
            head.description = head.description || site.description;
            head.image = head.image || `${site.url}${site.image}`;

            document.title = head.title;
            setMeta("og:title", head.title);
            setMeta("twitter:title", head.title);

            setMeta("description", head.description);
            setMeta("og:description", head.description);
            setMeta("twitter:description", head.description);

            setMeta("og:image", head.image);
            setMeta("twitter:image", head.image);
        }
        catch (ex) {
            console.log(ex);
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