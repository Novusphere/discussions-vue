import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/action')
export default class ActionController {
    constructor() {
    }

    @Api()
    @Get('/test')
    async test(req, res) {
        return res.success({
            ...req.unpack(),
            time: Date.now()
        })
    }
}