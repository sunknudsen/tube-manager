export declare const getRefreshToken: () => Promise<{
    access_token: any;
    refresh_token: any;
}>;
declare const peertubeClient: import("got/dist/source").Got;
export default peertubeClient;
