import { createArtificalTips } from "@/novusphere-js/uid";

export const submitPostMixin = {
    methods: {
        async submitPost({ post, transferActions }) {
            if (post.edit) {
                const p = this.tree[post.parentUuid].post;
                if (p) {
                    p.content = post.content;
                    p.title = post.title;
                }
            } else {
                if (this.tree[post.uuid]) return;

                const reply = { post, replies: [] };
                this.tree[post.uuid] = reply;
                this.tree[post.parentUuid].replies.unshift(reply);

                if (transferActions && transferActions.length > 0) {
                    const parent = this.tree[post.parentUuid];
                    if (parent) {
                        transferActions = transferActions.filter(ta => ta.recipientPublicKey == parent.post.uidw); // filter only tips for the parent post
                        if (transferActions.length > 0) {
                            let artificalTips = await createArtificalTips(
                                this.keys.wallet.pub,
                                post.transaction,
                                transferActions
                            );
                            parent.post.tips.push(...artificalTips);
                        }
                    }
                }
            }
        },
    }
}