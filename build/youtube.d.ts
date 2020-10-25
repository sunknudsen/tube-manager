import { Got } from "got";
import Config from "./config";
export default class YouTube {
    readonly config: Config;
    got: Got;
    constructor(config: Config);
    getRefreshToken(): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    getAccessToken(): Promise<string>;
}
