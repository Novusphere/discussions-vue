import { Controller, Get, Post } from '@decorators/express';
import { Api } from "../helpers";
import { config, getDatabase } from "../mongo";

@Controller('/upload')
export default class UploadController {
    constructor() {
    }
}