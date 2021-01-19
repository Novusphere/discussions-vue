import { apiRequest } from "./api";

export class DirectMsgSearchQuery {
    constructor(key, searchQuery) {
        this.key = key;
        this.setFrom(searchQuery);
    }

    //
    // Set from another search query
    //
    setFrom(searchQuery) {
        this.id = searchQuery.id;
        this.friendPublicKey = searchQuery.friendPublicKey;
        this.count = searchQuery.count;
        this.limit = searchQuery.limit;
    }

    //
    // Resets the search query
    //
    reset() {
        const searchQuery = {
            friendPublicKey: this.friendPublicKey,
            limit: this.limit,
        };

        this.setFrom(searchQuery);
    }

    //
    // Checks whether this search query has more data
    // Note: if next() hasn't been called yet, hasMore() will always return false 
    //
    hasMore() {
        return (this.id != 0);
    }

    async next() {
        const payload = await this.nextRaw();
        const result = payload.map(dbo => dbo);
        return result;
    }

    async nextRaw() {
        const queryObject = {
            id: this.id,
            friendPublicKey: this.friendPublicKey,
            count: this.count,
            limit: this.limit,
        };

        try {
            const startTime = Date.now();

            const { id, count, limit, msgs } = await apiRequest(`/v1/api/search/directmsgs`, queryObject, { key: this.key });

            this.id = id;
            this.count = count;
            this.limit = limit;

            const deltaTime = Date.now() - startTime;
            if (deltaTime > 1000)
                console.proxyLog(`DirectMsgSearchQuery took ${deltaTime}ms to return results`, this.pipeline);

            return msgs;
        }
        catch (ex) {
            console.error(`Trx Search query error`, this, ex);
            throw (ex);
        }
    }
}