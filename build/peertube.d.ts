import { Got } from "got";
import Config from "./config";
export default class PeerTube {
    readonly config: Config;
    got: Got;
    constructor(config: Config);
    getRefreshToken(): Promise<{
        access_token: any;
        refresh_token: any;
    }>;
    getAccessToken(): Promise<any>;
}
