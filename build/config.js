"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fs_1 = require("fs");
const prettier_1 = __importDefault(require("prettier"));
const readFileAsync = util_1.promisify(fs_1.readFile);
const writeFileAsync = util_1.promisify(fs_1.writeFile);
class Config {
    constructor(path, profile) {
        this.path = path;
        this.profile = profile;
    }
    async load() {
        const json = await readFileAsync(this.path, "utf8");
        this.profiles = JSON.parse(json);
        this.props = this.profiles[this.profile];
    }
    set(props) {
        // This doesn't support nested platform properties
        Object.keys(this.props).forEach((platform) => {
            const platformProps = this.props[platform];
            if (props[platform]) {
                Object.assign(platformProps, props[platform]);
            }
        });
        return this;
    }
    async save() {
        await writeFileAsync(this.path, prettier_1.default.format(JSON.stringify(this.profiles, null, 2), {
            parser: "json",
        }));
    }
}
exports.default = Config;
//# sourceMappingURL=config.js.map