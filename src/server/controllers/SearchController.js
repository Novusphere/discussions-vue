import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/search')
export default class SearchController {
    constructor() {
    }
}