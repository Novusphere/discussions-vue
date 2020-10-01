import express from 'express';
import { Controller, Post, Get, All } from '@decorators/express';
import { Api } from "../helpers";
import siteConfig from "../site";
import fs from 'fs';

const multer = require('multer');
const mime = require('mime');
const path = require('path');

export default @Controller('/upload') class UploadController {
    constructor() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join('public', 'uploads'))
            },
            filename: (req, file, cb) => {
                // TO-DO: change to hash?
                const filename = `${Date.now()}.${mime.getExtension(file.mimetype)}`;
                cb(null, filename);
            }
        });

        const upload = multer({
            storage: storage,
            fileFilter: function (req, file, cb) {
                const imageRx = /\.(jpg|jpeg|png|gif)$/i;
                const ext = `.${mime.getExtension(file.mimetype)}`;
                if (!ext.match(imageRx)) {
                    return cb(new Error('Only image files are allowed!'));
                }
                cb(null, true);
            },
            limits: {
                files: 1, // allow only 1 file per request
                fileSize: (siteConfig.uploadLimit || 1) * 1024 * 1024, // (max file size)
            },
        });

        this.uploadSingle = upload.single('image');
    }

    @All('/file/:filename')
    async getFile(req, res) {
        const [filename] = req.params.filename.match(/[a-z0-9]+/i);
        const mimeType = mime.getType(req.params.filename);
        const ext = mime.getExtension(mimeType);

        fs.readFile(path.join('public', 'uploads', `${filename}.${ext}`), function (err, data) {
            if (err) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: `File not found` }));
            }
            res.setHeader('Content-Type', mimeType);
            res.writeHead(200);
            return res.end(data);
        });
    }

    @Api()
    @Post('/')
    async uploadFile(req, res) {
        const filename = await (new Promise((resolve, reject) => {
            this.uploadSingle(req, res, (err) => {
                if (err) return reject(err);
                const file = req.file;
                if (file) return resolve(file.filename);
                return reject(new Error(`An unexpected error occured while uploading`));
            });
        }));

        return res.success({
            filename
        })
    }
}