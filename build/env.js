"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.loadConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("util");
const fs_1 = require("fs");
const writeFileAsync = util_1.promisify(fs_1.writeFile);
exports.loadConfig = async function (path) {
    process.env.TUBE_MANAGER_CONFIG_PATH = path;
    return dotenv_1.default.config({
        path: path,
    });
};
exports.updateConfig = async function (variables) {
    const config = exports.loadConfig(process.env.TUBE_MANAGER_CONFIG_PATH);
    const merged = Object.assign(process.env, variables);
    let data = "";
    Object.keys(merged).forEach(function (key) {
        data += `${key}=${merged[key]}\n`;
    });
    await writeFileAsync(process.env.TUBE_MANAGER_CONFIG_PATH, data);
};
//# sourceMappingURL=env.js.map