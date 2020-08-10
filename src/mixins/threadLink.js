export const threadLinkMixin = {
    computed: {
        link() {
            if (!this.post) return '';
            return this.getThreadLink(this.post);
        }
    },
    methods: {
        openThreadDialog(post) {
            const sub = post.sub;
            let title = undefined, referenceId = undefined, referenceId2 = undefined;

            if (post.op) {
                title = post.op.getSnakeCaseTitle();
                referenceId = post.op.getEncodedId();
                referenceId2 = post.getEncodedId();
            }
            else {
                title = post.getSnakeCaseTitle();
                referenceId = post.getEncodedId();
                referenceId2 = undefined;
            }

            this.$store.commit("setThreadDialogOpen", {
                value: true,
                sub,
                referenceId,
                title,
                referenceId2,
            });
        },
        getThreadLink(post) {
            let link = `/tag/${post.sub}`;
            if (post.op && post.transaction != post.op.transaction) {
                link += `/${post.op.getEncodedId()}/${post.op.getSnakeCaseTitle()}/${post.getEncodedId()}`;
            } else {
                link += `/${post.getEncodedId()}/${post.getSnakeCaseTitle()}`;
            }
            return link;
        }
    }
}