"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const open_1 = __importDefault(require("open"));
const inquirer_1 = __importDefault(require("inquirer"));
const query_string_1 = __importDefault(require("query-string"));
const got_1 = __importDefault(require("got"));
class YouTube {
    constructor(config) {
        this.config = config;
        this.got = got_1.default.extend({
            mutableDefaults: true,
            prefixUrl: this.config.props.youtube.apiPrefixUrl,
            headers: {
                authorization: this.config.props.youtube.accessToken !== ""
                    ? `Bearer ${this.config.props.youtube.accessToken}`
                    : undefined,
            },
            responseType: "json",
            hooks: {
                afterResponse: [
                    async (response, retryWithMergedOptions) => {
                        if ([401, 403].includes(response.statusCode)) {
                            const accessToken = await this.getAccessToken();
                            const updatedOptions = {
                                headers: {
                                    authorization: `Bearer ${accessToken}`,
                                },
                            };
                            this.got.defaults.options = got_1.default.mergeOptions(this.got.defaults.options, updatedOptions);
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
    }
    async getRefreshToken() {
        try {
            // See https://developers.google.com/identity/protocols/oauth2/web-server
            // See https://developers.google.com/identity/protocols/oauth2/scopes#youtube
            open_1.default(`${this.config.props.youtube.oauth2PrefixUrl}/auth?client_id=${this.config.props.youtube.clientId}&redirect_uri=http://localhost:8080&response_type=code&scope=https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/yt-analytics-monetary.readonly&access_type=offline`);
            const values = await inquirer_1.default.prompt({
                name: "redirectUri",
                message: "Please paste redirect URI here and press enter",
                validate: function (value) {
                    if (value.match(/http:\/\/localhost:8080\/\?code=/)) {
                        return true;
                    }
                    return "Please enter a valid redirect URI";
                },
            });
            const parsed = query_string_1.default.parseUrl(values.redirectUri);
            // See https://developers.google.com/identity/protocols/oauth2/web-server
            const response = await this.got.post(`token`, {
                prefixUrl: this.config.props.youtube.oauth2PrefixUrl,
                json: {
                    client_id: this.config.props.youtube.clientId,
                    client_secret: this.config.props.youtube.clientSecret,
                    code: parsed.query.code,
                    grant_type: "authorization_code",
                    redirect_uri: "http://localhost:8080",
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
    }
    async getAccessToken() {
        try {
            let refreshToken = this.config.props.youtube.refreshToken;
            if (refreshToken === "") {
                const values = await inquirer_1.default.prompt({
                    type: "password",
                    name: "refreshToken",
                    message: "Please paste YouTube refresh token here and press enter",
                });
                refreshToken = values.refreshToken;
            }
            // See https://developers.google.com/identity/protocols/oauth2/web-server
            const response = await this.got.post(`token`, {
                prefixUrl: this.config.props.youtube.oauth2PrefixUrl,
                json: {
                    client_id: this.config.props.youtube.clientId,
                    client_secret: this.config.props.youtube.clientSecret,
                    refresh_token: refreshToken,
                    grant_type: "refresh_token",
                },
                responseType: "json",
            });
            this.config
                .set({
                youtube: {
                    accessToken: response.body.access_token,
                },
            })
                .save();
            return response.body.access_token;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.default = YouTube;
//# sourceMappingURL=youtube.js.map