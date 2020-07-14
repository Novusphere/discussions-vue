import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/uid')
export default class UnifiedIdController {
    constructor() {
    }
}