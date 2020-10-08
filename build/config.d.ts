interface Props {
    youtube: {
        oauth2PrefixUrl: string;
        apiPrefixUrl: string;
        clientId: string;
        clientSecret: string;
        accessToken: string;
        refreshToken: string;
        channelId: string;
        channelWatchUrl: string;
    };
    peertube: {
        apiPrefixUrl: string;
        clientId: string;
        clientSecret: string;
        accessToken: string;
        refreshToken: string;
        accountName: string;
        channelId: string;
        channelWatchUrl: string;
    };
}
declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export default class Config {
    readonly path: string;
    readonly profile: string;
    private profiles;
    props: Props;
    constructor(path: string, profile: string);
    load(): Promise<void>;
    set(props: DeepPartial<Props>): this;
    save(): Promise<void>;
}
export {};
