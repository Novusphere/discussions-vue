import { apiRequest } from "../discussions/api";

export class TransactionSearchQuery {
    constructor(searchQuery) {
        this.setFrom(searchQuery);
    }

    //
    // Set from another search query
    //
    setFrom(searchQuery) {
        this.id = searchQuery.id;
        this.pipeline = searchQuery.pipeline;
        this.count = searchQuery.count;
        this.limit = searchQuery.limit;
    }

    //
    // Resets the search query
    //
    reset() {
        const searchQuery = {
            pipeline: this.pipeline,
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
            pipeline: this.pipeline,
            count: this.count,
            limit: this.limit,
        };

        try {
            const startTime = Date.now();

            const { id, count, limit, trxs } = await apiRequest(`/v1/api/search/uid`, queryObject);

            this.id = id;
            this.count = count;
            this.limit = limit;

            const deltaTime = Date.now() - startTime;
            if (deltaTime > 1000)
                console.proxyLog(`TransactionSearchQuery took ${deltaTime}ms to return results`, this.pipeline);

            return trxs;
        }
        catch (ex) {
            console.error(`Trx Search query error`, this, ex);
            throw (ex);
        }
    }
}