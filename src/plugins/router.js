import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter);

import BlankPage from '@/pages/BlankPage';
import LogOutPage from "@/pages/LogOutPage";

//import MainLayoutPage from "@/pages/MainLayoutPage";

import SubmitPostPage from "@/pages/SubmitPostPage";
import UserProfilePage from "@/pages/UserProfilePage";
import CommunityPage from "@/pages/CommunityPage";
import BrowseSearchPage from "@/pages/BrowseSearchPage";
import BrowseFeedPage from "@/pages/BrowseFeedPage";
import BrowseThreadPage from "@/pages/BrowseThreadPage";
import BrowseTrendingPostsPage from "@/pages/BrowseTrendingPostsPage";
import BrowseTagPostsPage from "@/pages/BrowseTagPostsPage";
import BrowseNotifications from "@/pages/BrowseNotifications";

import WalletPage from "@/pages/wallet/WalletPage";
import WalletAssetsPage from "@/pages/wallet/WalletAssetsPage";
import WalletWithdrawPage from "@/pages/wallet/WalletWithdrawPage";

import TestsPage from "@/pages/tests/TestsPage";
import TestEditorPage from '@/pages/tests/TestEditorPage';
import TestBrowsePostsPage from '@/pages/tests/posts/TestBrowsePostsPage';

const routes = [
    {
        path: '/',
        redirect: '/tag/all',
        component: BlankPage,
        children: [
            { path: 'submit', component: SubmitPostPage },
            { path: 'logout', component: LogOutPage },
            { path: 'feed', component: BrowseFeedPage },
            { path: 'search', component: BrowseSearchPage },
            { path: 'notifications', component: BrowseNotifications },
            { path: 'tag/all', component: BrowseTrendingPostsPage },
            { path: 'tag/:tags/submit', component: SubmitPostPage },
            { path: 'tag/:tags/:referenceId/:referenceId2?', component: BrowseThreadPage },
            { path: 'tag/:tags', component: BrowseTagPostsPage },
            { path: 'community', component: CommunityPage },
            { path: 'u/:who/:tab?', component: UserProfilePage },
            {
                path: 'wallet',
                component: WalletPage,
                children: [
                    { path: '', component: WalletAssetsPage },
                    { path: 'assets', component: WalletAssetsPage },
                    { path: 'withdraw', component: WalletWithdrawPage }
                ]
            },
        ]
    },
    {
        path: '/tests',
        component: BlankPage,
        children: [
            {
                path: '',
                component: TestsPage,
            },
            {
                path: 'editor',
                component: TestEditorPage
            },
            {
                path: 'posts',
                component: BlankPage,
                children: [
                    {
                        path: 'browse/:transactionIds',
                        component: TestBrowsePostsPage
                    }
                ]
            }
        ]
    }
]

export default new VueRouter({
    mode: 'history',
    routes
})  