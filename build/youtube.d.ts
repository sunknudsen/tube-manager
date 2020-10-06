export declare const getRefreshToken: () => Promise<{
    access_token: any;
    refresh_token: any;
}>;
declare const youtubeClient: import("got/dist/source").Got;
export default youtubeClient;
