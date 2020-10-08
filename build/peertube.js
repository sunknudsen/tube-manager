"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const got_1 = __importDefault(require("got"));
class PeerTube {
    constructor(config) {
        this.config = config;
        this.got = got_1.default.extend({
            mutableDefaults: true,
            prefixUrl: this.config.props.peertube.apiPrefixUrl,
            headers: {
                authorization: this.config.props.peertube.accessToken !== ""
                    ? `Bearer ${this.config.props.peertube.accessToken}`
                    : undefined,
            },
            responseType: "json",
            hooks: {
                afterResponse: [
                    async (response, retryWithMergedOptions) => {
                        if (response.statusCode === 401) {
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
            const response = await this.got.post(`users/token`, {
                prefixUrl: this.config.props.peertube.apiPrefixUrl,
                form: {
                    client_id: this.config.props.peertube.clientId,
                    client_secret: this.config.props.peertube.clientSecret,
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
    }
    async getAccessToken() {
        try {
            let refreshToken = this.config.props.peertube.refreshToken;
            if (refreshToken === "") {
                const values = await inquirer_1.default.prompt({
                    type: "password",
                    name: "refreshToken",
                    message: "Please paste PeerTube refresh token here and press enter",
                });
                refreshToken = values.refreshToken;
            }
            // See https://docs.joinpeertube.org/api-rest-reference.html#section/Authentication
            const response = await this.got.post(`users/token`, {
                prefixUrl: this.config.props.peertube.apiPrefixUrl,
                form: {
                    client_id: this.config.props.peertube.clientId,
                    client_secret: this.config.props.peertube.clientSecret,
                    refresh_token: refreshToken,
                    grant_type: "refresh_token",
                },
                responseType: "json",
            });
            if (this.config.props.peertube.refreshToken !== "") {
                await this.config
                    .set({
                    peertube: {
                        accessToken: response.body.access_token,
                        refreshToken: response.body.refresh_token,
                    },
                })
                    .save();
            }
            else {
                await this.config
                    .set({
                    peertube: {
                        accessToken: response.body.access_token,
                    },
                })
                    .save();
                console.log(`PeerTube refresh token has changed to "${response.body.refresh_token}"`);
            }
            return response.body.access_token;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.default = PeerTube;
//# sourceMappingURL=peertube.js.map