"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = __importDefault(require("got"));
const form_data_1 = __importDefault(require("form-data"));
const test = async function () {
    const form = new form_data_1.default();
    form.append("title", "Big Buck Bunny");
    form.append("description", "This is a test...");
    const initialOptions = {
        headers: {
            authorization: "Bearer 95db19b1aaf842b136709b33503f59f959c5272d",
        },
        body: form,
        responseType: "json",
        throwHttpErrors: false,
    };
    console.log(initialOptions);
    const initialVideoResponse = await got_1.default.put(`https://peertube.sunknudsen.com/api/v1/videos/f79b7b72-817f-4ba1-9c58-d59d63d64366`, initialOptions);
    console.log(initialVideoResponse.statusCode, initialVideoResponse.body);
    const tokenResponse = await got_1.default.post(`https://peertube.sunknudsen.com/api/v1/users/token`, {
        form: {
            client_id: "02xcjpew1qp4w3gkdsxecc1p16j3ugtu",
            client_secret: "UD9RtsmEAQwXv0YKCwuPndvpV1jlNXcY",
            refresh_token: "b818464dc52e6771a6fc16bbbdad8ec9a315edb1",
            grant_type: "refresh_token",
        },
        responseType: "json",
        throwHttpErrors: false,
    });
    console.log(tokenResponse.statusCode, tokenResponse.body);
    const retryOptions = {
        headers: {
            authorization: `Bearer ${tokenResponse.body.access_token}`,
        },
        body: form,
        responseType: "json",
        throwHttpErrors: false,
    };
    console.log(retryOptions);
    const retryVideoResponse = await got_1.default.put(`https://peertube.sunknudsen.com/api/v1/videos/f79b7b72-817f-4ba1-9c58-d59d63d64366`, retryOptions);
    console.log(retryVideoResponse.statusCode, retryVideoResponse.body);
};
test();
//# sourceMappingURL=test.js.map