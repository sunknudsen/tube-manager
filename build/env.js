"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDotEnv = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const result = dotenv_1.default.config();
const dotenvPath = path_1.resolve(process.cwd(), ".env");
const writeFileAsync = util_1.promisify(fs_1.writeFile);
exports.updateDotEnv = async function (variables) {
    const merged = Object.assign(result.parsed, variables);
    let data = "";
    Object.keys(merged).forEach(function (key) {
        data += `${key}=${merged[key]}\n`;
    });
    await writeFileAsync(dotenvPath, data);
};
//# sourceMappingURL=env.js.map