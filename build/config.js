"use strict";
import { promisify } from "util";
import { readFile, writeFile } from "fs";
import prettier from "prettier";
const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
export default class Config {
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
        await writeFileAsync(this.path, prettier.format(JSON.stringify(this.profiles, null, 2), {
            parser: "json",
        }));
    }
}
//# sourceMappingURL=config.js.map