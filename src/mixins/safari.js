export const safariMixin = {
    computed: {
        isSafari() {
            if (
                navigator.userAgent.match(/safari/i) &&
                !navigator.userAgent.match(/chrome/i)
            ) {
                return true;
            }
            return false;
        }
    }
}