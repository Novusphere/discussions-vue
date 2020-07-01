import Joi from "@hapi/joi";
import * as axios from "axios";
import { Post } from "./Post";

const schema = Joi.object({
    id: Joi.number().default(0),
    pipeline: Joi.array().items(Joi.object()).required(),
    count: Joi.number().default(0),
    limit: Joi.number().default(20),
    sort: Joi.string(),
    votePublicKey: Joi.string(),
    includeOpeningPost: Joi.boolean().default(false),
    moderatorKeys: Joi.array().items(Joi.string())
});

export class PostSearchQuery {
    //
    // Creates a search query, see schema for details
    //
    constructor(searchQuery) {
        this.setFrom(searchQuery);
    }

    //
    // Set from another search query
    //
    setFrom(searchQuery) {
        searchQuery = schema.validate(searchQuery).value;

        this.id = searchQuery.id;
        this.pipeline = searchQuery.pipeline;
        this.count = searchQuery.count;
        this.limit = searchQuery.limit;
        this.sort = searchQuery.sort;
        this.includeOpeningPost = searchQuery.includeOpeningPost;
        this.votePublicKey = searchQuery.votePublicKey;
        this.moderatorKeys = searchQuery.moderatorKeys;
    }

    //
    // Resets the search query
    //
    reset() {
        const searchQuery = {
            pipeline: this.pipeline,
            limit: this.limit,
            sort: this.sort,
            includeOpeningPost: this.includeOpeningPost,
            votePublicKey: this.votePublicKey,
            moderatorKeys: this.moderatorKeys
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

    //
    //  Directly returns the payload from a search
    //
    async next() {
        const payload = await this.nextRaw();
        const result = payload.map(dbo => Post.fromDbObject(dbo));
        //console.log(result[0].transaction + ' - ' + result[0].title);
        //console.log(JSON.stringify(queryObject));
        return result;
    }

    //
    // Returns a Post[] of next posts for the query asynchronously
    //
    async nextRaw() {
        const url = `https://atmosdb.novusphere.io/discussions/search`;

        const queryObject = {
            cursorId: this.id,
            pipeline: this.pipeline,
            count: this.count,
            limit: this.limit,
            sort: this.sort,
            key: this.votePublicKey,
            op: this.includeOpeningPost,
            mods: this.moderatorKeys
        };

        const query = `data=${encodeURIComponent(JSON.stringify(queryObject))}`;
        //console.log(JSON.stringify(queryObject));

        try {
            const startTime = Date.now();
            const { data } = await axios.post(url, query);
            if (data.error) {
                throw new Error(data.message);
            }

            this.id = data.cursorId;
            this.count = data.count;
            this.limit = data.limimt;

            const deltaTime = Date.now() - startTime;
            if (deltaTime > 1000)
                console.proxyLog(`PostSearchQuery took ${deltaTime}ms to return results`, this.pipeline);

            return data.payload;
        }
        catch (ex) {
            console.error(`Search query error`, this, ex);
            throw (ex);
        }
    }
}