import { mapGetters, mapState } from "vuex";
import { waitFor } from "@/novusphere-js/utility";

//
// Wrap a Vue component export to watch for isLoggedIn and require it, otherwise redirect
//
function requireLoggedIn(component) {
    let created = component.created;
    let watch = component.watch;
    let computed = component.computed;

    component.created = async function () {
        if (this.needSyncAccount) {
            await waitFor(async () => !this.needSyncAccount, 100);
        }
        if (!this.isLoggedIn) this.$router.push(`/`);
        else if (created) created.apply(this, arguments);
    };

    component.computed = {
        ...computed,
        ...mapGetters(["isLoggedIn"]),
        ...mapState({
            needSyncAccount: state => state.needSyncAccount
        })
    };

    component.watch = {
        ...watch,
        isLoggedIn() {
            if (!this.isLoggedIn) this.$router.push(`/`);
            if (watch && watch.isLoggedIn) watch.isLoggedIn.apply(this, arguments);
        }
    };

    return component;
}

export {
    requireLoggedIn
}