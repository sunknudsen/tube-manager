"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRefreshToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const inquirer_1 = __importDefault(require("inquirer"));
const got_1 = __importDefault(require("got"));
const env_1 = require("./env");
dotenv_1.default.config();
exports.getRefreshToken = async function () {
    try {
        const values = await inquirer_1.default.prompt([
            {
                name: "username",
                message: "Please enter PeerTube username and press enter",
            },
            {
                type: "password",
                name: "password",
                message: "Please enter PeerTube password and press enter",
            },
        ]);
        // See https://docs.joinpeertube.org/api-rest-reference.html#section/Authentication
        const response = await got_1.default.post(`users/token`, {
            prefixUrl: process.env.PEERTUBE_API_PREFIX_URL,
            form: {
                client_id: process.env.PEERTUBE_CLIENT_ID,
                client_secret: process.env.PEERTUBE_CLIENT_SECRET,
                response_type: "code",
                grant_type: "password",
                username: values.username,
                password: values.password,
            },
            responseType: "json",
        });
        return {
            access_token: response.body.access_token,
            refresh_token: response.body.refresh_token,
        };
    }
    catch (error) {
        throw error;
    }
};
const getAccessToken = async function () {
    try {
        let refreshToken = process.env.PEERTUBE_REFRESH_TOKEN;
        if (refreshToken === "") {
            const values = await inquirer_1.default.prompt({
                type: "password",
                name: "refreshToken",
                message: "Please paste PeerTube refresh token here and press enter",
            });
            refreshToken = values.refreshToken;
        }
        // See https://docs.joinpeertube.org/api-rest-reference.html#section/Authentication
        const response = await got_1.default.post(`users/token`, {
            prefixUrl: process.env.PEERTUBE_API_PREFIX_URL,
            form: {
                client_id: process.env.PEERTUBE_CLIENT_ID,
                client_secret: process.env.PEERTUBE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            },
            responseType: "json",
        });
        if (process.env.PEERTUBE_REFRESH_TOKEN !== "") {
            env_1.updateDotEnv({
                PEERTUBE_ACCESS_TOKEN: response.body.access_token,
                PEERTUBE_REFRESH_TOKEN: response.body.refresh_token,
            });
        }
        else {
            env_1.updateDotEnv({
                PEERTUBE_ACCESS_TOKEN: response.body.access_token,
            });
        }
        return response.body.access_token;
    }
    catch (error) {
        throw error;
    }
};
const peertubeClient = got_1.default.extend({
    mutableDefaults: true,
    prefixUrl: process.env.PEERTUBE_API_PREFIX_URL,
    headers: {
        authorization: process.env.PEERTUBE_ACCESS_TOKEN !== ""
            ? `Bearer ${process.env.PEERTUBE_ACCESS_TOKEN}`
            : undefined,
    },
    responseType: "json",
    hooks: {
        afterResponse: [
            async (response, retryWithMergedOptions) => {
                if (response.statusCode === 401) {
                    const accessToken = await getAccessToken();
                    const updatedOptions = {
                        headers: {
                            authorization: `Bearer ${accessToken}`,
                        },
                    };
                    peertubeClient.defaults.options = got_1.default.mergeOptions(peertubeClient.defaults.options, updatedOptions);
                    return retryWithMergedOptions(updatedOptions);
                }
                return response;
            },
        ],
    },
    retry: {
        limit: 2,
    },
});
exports.default = peertubeClient;
//# sourceMappingURL=peertube.js.map