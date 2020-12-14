"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const form_data_1 = __importDefault(require("form-data"));
const get_stream_1 = __importDefault(require("get-stream"));
const fs_1 = require("fs");
const util_1 = require("util");
const path_1 = require("path");
const readFileAsync = util_1.promisify(fs_1.readFile);
const thumbnail = "/Users/sunknudsen/Code/sunknudsen/sunknudsen-website/tube-manager/uJBgb8XJoA8.jpg";
!(async function () {
    const form = new form_data_1.default();
    form.append("name", "foo");
    form.append("thumbnailfile", await readFileAsync(thumbnail, { encoding: "binary" }), {
        contentType: "image/jpeg",
        filename: path_1.parse(thumbnail).base,
    });
    await got_1.default.put(`https://peertube.sunknudsen.com/api/v1/videos/db71b05a-f648-4bdf-a037-6f91827ed0f3`, {
        headers: form.getHeaders(),
        body: await get_stream_1.default(form),
    });
})();
//# sourceMappingURL=test.js.map