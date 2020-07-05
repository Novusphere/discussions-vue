import { waitFor } from "@/novusphere-js/utility";

export default class Lock {
    Lock() {
        this.isLocked = false;
    }
    async lock(asyncTask) {
        await waitFor(() => !this.isLocked);
        this.isLocked = true;
        try {
            await asyncTask();
        }
        finally {
            this.isLocked = false;
        }
    }
}