"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const commander_1 = __importDefault(require("commander"));
const p_whilst_1 = __importDefault(require("p-whilst"));
const youtube_1 = __importStar(require("./youtube"));
const peertube_1 = __importStar(require("./peertube"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const inquirer_1 = __importDefault(require("inquirer"));
const leven_1 = __importDefault(require("leven"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
dotenv_1.default.config();
const readFileAsync = util_1.promisify(fs_1.readFile);
const writeFileAsync = util_1.promisify(fs_1.writeFile);
commander_1.default
    .command("refresh-token <platform>")
    .description("get refresh token")
    .action(async (platform) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error("Invalid platform");
        }
        if (platform === "youtube") {
            let refreshToken = await youtube_1.getRefreshToken();
            console.log(refreshToken);
        }
        else if (platform === "peertube") {
            let refreshToken = await peertube_1.getRefreshToken();
            console.log(refreshToken);
        }
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default
    .command("channels <platform>")
    .description("get channels")
    .action(async (platform) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error("Invalid platform");
        }
        if (platform === "youtube") {
            // See https://developers.google.com/youtube/v3/docs/channels/list
            const channelsResponse = await youtube_1.default.get("channels", {
                searchParams: {
                    part: "id,snippet",
                    mine: true,
                },
            });
            let channels = [];
            channelsResponse.body.items.forEach(function (item) {
                channels.push({
                    id: item.id,
                    title: item.snippet.title,
                    description: item.snippet.description,
                });
            });
            console.log(channels);
        }
        else if (platform === "peertube") {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/My-User/paths/~1users~1me/get
            const meResponse = await peertube_1.default.get(`users/me`);
            let channels = [];
            meResponse.body.videoChannels.forEach(function (videoChannel) {
                channels.push({
                    id: videoChannel.id,
                    name: videoChannel.name,
                    description: videoChannel.description,
                });
            });
            console.log(channels);
        }
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default
    .command("stats <platform>")
    .description("get stats")
    .action(async (platform) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error("Invalid platform");
        }
        if (platform === "youtube") {
            // See https://developers.google.com/youtube/v3/docs/channels/list
            const channelsResponse = await youtube_1.default.get("channels", {
                searchParams: {
                    id: process.env.YOUTUBE_CHANNEL_ID,
                    part: "statistics",
                },
            });
            if (channelsResponse.body.items.length !== 1) {
                throw new Error("Could not find channel");
            }
            const statistics = channelsResponse.body.items[0].statistics;
            console.log({
                viewCount: statistics.viewCount,
                subscriberCount: statistics.subscriberCount,
            });
        }
        else if (platform === "peertube") {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/My-User/paths/~1users~1me/get
            const meResponse = await peertube_1.default.get(`users/me`);
            let stats = {
                account: {
                    followersCount: meResponse.body.account.followersCount,
                },
                videoChannels: [],
            };
            meResponse.body.videoChannels.forEach(function (videoChannel) {
                stats.videoChannels.push({
                    displayName: videoChannel.displayName,
                    followersCount: videoChannel.followersCount,
                });
            });
            console.log(stats);
        }
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default
    .command("video <platform> <id>")
    .description("get video")
    .action(async (platform, id) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error("Invalid platform");
        }
        if (platform === "youtube") {
            // See https://developers.google.com/youtube/v3/docs/videos/list
            const videosResponse = await youtube_1.default.get("videos", {
                searchParams: {
                    id: id,
                    part: "id,snippet",
                },
            });
            console.log(util_1.inspect(videosResponse.body.items[0], false, 3, true));
        }
        else if (platform === "peertube") {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/get
            const videosResponse = await peertube_1.default.get(`videos/${id}`);
            console.log(videosResponse.body);
        }
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default
    .command("initialize")
    .description("initialize tube manager")
    .option("--include <include>", "include videos IDs")
    .option("--exclude <exclude>", "exclude videos IDs")
    .option("--dataset <dataset>", "/path/to/dataset.json", path_1.default.resolve(process.cwd(), "tube-manager.json"))
    .action(async (command) => {
    try {
        if (fs_1.existsSync(command.dataset)) {
            const values = await inquirer_1.default.prompt({
                type: "confirm",
                name: "confirmation",
                message: `Do you wish to override ${command.dataset}?`,
            });
            if (values.confirmation !== true) {
                process.exit(0);
            }
        }
        let ids;
        if (command.include) {
            ids = command.include.replace(/ /g, "").split(",");
        }
        else {
            ids = [];
            // See https://developers.google.com/youtube/v3/docs/channels/list
            const channelsResponse = await youtube_1.default.get("channels", {
                searchParams: {
                    id: process.env.YOUTUBE_CHANNEL_ID,
                    part: "contentDetails",
                },
            });
            if (channelsResponse.body.items.length !== 1) {
                throw new Error("Could not find channel");
            }
            const playlistId = channelsResponse.body.items[0].contentDetails.relatedPlaylists.uploads;
            let items = [];
            let pageToken = null;
            await p_whilst_1.default(() => pageToken !== undefined, async () => {
                // See https://developers.google.com/youtube/v3/docs/playlistItems/list
                const playlistItemsResponse = await youtube_1.default.get("playlistItems", {
                    searchParams: {
                        playlistId: playlistId,
                        part: "id,snippet",
                        maxResults: "50",
                        pageToken: pageToken,
                    },
                });
                pageToken = playlistItemsResponse.body.nextPageToken;
                playlistItemsResponse.body.items.forEach(function (item) {
                    items.push(item);
                });
            });
            items.forEach(function (item) {
                if (command.exclude) {
                    const excluded = command.exclude.replace(/ /g, "").split(",");
                    if (excluded.indexOf(item.snippet.resourceId.videoId) === -1) {
                        ids.push(item.snippet.resourceId.videoId);
                    }
                }
                else {
                    ids.push(item.snippet.resourceId.videoId);
                }
            });
        }
        let youtubeVideos = [];
        const chunk = 50;
        for (let index = 0; index < ids.length; index += chunk) {
            let slice = ids.slice(index, index + chunk);
            // See https://developers.google.com/youtube/v3/docs/videos/list
            let videosResponse = await youtube_1.default.get("videos", {
                searchParams: {
                    id: slice.join(","),
                    part: "id,snippet",
                },
            });
            youtubeVideos = youtubeVideos.concat(videosResponse.body.items);
        }
        let peertubeVideos = [];
        if (process.env.PEERTUBE_ACCOUNT_NAME) {
            let start = 0;
            let total = null;
            await p_whilst_1.default(() => total === null || peertubeVideos.length < total, async () => {
                // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos/get
                const accountVideosResponse = await peertube_1.default.get(`accounts/${process.env.PEERTUBE_ACCOUNT_NAME}/videos`, {
                    searchParams: {
                        count: 50,
                        start: start,
                    },
                });
                peertubeVideos = peertubeVideos.concat(accountVideosResponse.body.data);
                total = accountVideosResponse.body.total;
                start = peertubeVideos.length;
            });
        }
        const getPeerTubeUuid = function (title) {
            let uuid;
            for (let index = 0; index < peertubeVideos.length; index++) {
                const peertubeVideo = peertubeVideos[index];
                if (leven_1.default(title, peertubeVideo.name) < 2) {
                    uuid = peertubeVideo.uuid;
                    break;
                }
            }
            return uuid;
        };
        let json = {
            headings: {
                sections: "Sections",
                suggestedVideos: "Suggested",
                links: "Links",
                credits: "Credits",
                affiliateLinks: "Credits",
                footnotes: "Footnotes",
            },
            separator: "👉",
            affiliateLinks: {
                amazon: {},
            },
            videos: {},
        };
        youtubeVideos.forEach(function (youtubeVideo) {
            let peertubeUuid = getPeerTubeUuid(youtubeVideo.snippet.title);
            if (peertubeVideos.length > 0 && !peertubeUuid) {
                console.log(`Could not find PeerTube video matching "${youtubeVideo.snippet.title}"`);
            }
            json.videos[youtubeVideo.id] = {
                id: youtubeVideo.id,
                peerTubeUuid: peertubeUuid ? peertubeUuid : null,
                publishedAt: youtubeVideo.snippet.publishedAt,
                title: youtubeVideo.snippet.title,
                description: youtubeVideo.snippet.description,
                tags: youtubeVideo.snippet.tags,
                sections: [],
                suggestedVideos: [],
                links: [],
                credits: [],
                affiliateLinks: [],
                footnotes: [],
            };
        });
        await writeFileAsync(command.dataset, JSON.stringify(json, null, 2));
        console.log(`Imported ${Object.keys(json.videos).length} videos to ${command.dataset}`);
    }
    catch (error) {
        console.log(error);
    }
});
const heading = function (value) {
    return `\n\n==============================\n${value.toUpperCase()}\n==============================`;
};
const description = function (dataset, platform, video) {
    let content = video.description;
    if (video.sections.length > 0) {
        content += heading(dataset.headings.sections);
        video.sections.forEach(function (section) {
            content += `\n${section.timestamp} ${section.label}`;
        });
    }
    if (video.suggestedVideos.length > 0) {
        content += heading(dataset.headings.suggestedVideos);
        video.suggestedVideos.forEach(function (suggestedVideo) {
            if (typeof suggestedVideo === "string" &&
                suggestedVideo.match(/^video\.[a-zA-Z0-9_\-]{11}/)) {
                const suggestedVideoId = suggestedVideo.split(".")[1];
                const suggestedVideoAttributes = dataset.videos[suggestedVideoId];
                if (!suggestedVideoAttributes) {
                    throw new Error("Not found");
                }
                if (platform === "youtube") {
                    content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${process.env.YOUTUBE_CHANNEL_WATCH_URL}${suggestedVideoAttributes.id}`;
                }
                else if (platform === "peertube") {
                    content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${process.env.PEERTUBE_CHANNEL_WATCH_URL}${suggestedVideoAttributes.peerTubeUuid}`;
                }
            }
            else if (typeof suggestedVideo === "string") {
                content += `\n${suggestedVideo}`;
            }
            else {
                content += `\n${suggestedVideo.label} ${dataset.separator} ${suggestedVideo.url}`;
            }
        });
    }
    if (video.links.length > 0) {
        content += heading(dataset.headings.links);
        video.links.forEach(function (link) {
            if (typeof link === "string") {
                content += `\n${link}`;
            }
            else {
                content += `\n${link.label} ${dataset.separator} ${link.url}`;
            }
        });
    }
    if (video.credits.length > 0) {
        content += heading(dataset.headings.credits);
        video.credits.forEach(function (credit) {
            if (typeof credit === "string") {
                content += `\n${credit}`;
            }
            else {
                content += `\n${credit.label} ${dataset.separator} ${credit.url}`;
            }
        });
    }
    if (video.affiliateLinks.length > 0) {
        content += heading(dataset.headings.affiliateLinks);
        let count = 0;
        video.affiliateLinks.forEach(function (affiliateLink) {
            if (typeof affiliateLink === "string" &&
                affiliateLink.match(/^(\w+?)\.(\w+?)$/)) {
                const affiliateLinkMatch = affiliateLink.match(/^(\w+?)\.(\w+?)$/);
                const affiliateLinkAttributes = dataset.affiliateLinks[affiliateLinkMatch[1]][affiliateLinkMatch[2]];
                if (!affiliateLinkAttributes) {
                    throw Error("Not found");
                }
                if (typeof affiliateLinkAttributes === "string") {
                    content += `\n${affiliateLinkAttributes}`;
                }
                else if (affiliateLinkAttributes.url instanceof Array) {
                    if (count !== 0) {
                        content += "\n";
                    }
                    content += `\n${affiliateLinkAttributes.label}`;
                    affiliateLinkAttributes.url.forEach(function (_url) {
                        if (typeof _url === "string") {
                            content += `\n${_url}`;
                        }
                        else {
                            content += `\n${_url.label} ${dataset.separator} ${_url.url}`;
                        }
                    });
                }
                else {
                    content += `\n${affiliateLinkAttributes.label} ${dataset.separator} ${affiliateLinkAttributes.url}`;
                }
            }
            else if (typeof affiliateLink === "string") {
                content += `\n${affiliateLink}`;
            }
            else if (affiliateLink.url instanceof Array) {
                if (count !== 0) {
                    content += "\n";
                }
                content += `\n${affiliateLink.label}`;
                affiliateLink.url.forEach(function (_url) {
                    if (typeof _url === "string") {
                        content += `\n${_url}`;
                    }
                    else {
                        content += `\n${_url.label} ${dataset.separator} ${_url.url}`;
                    }
                });
            }
            else {
                content += `\n${affiliateLink.label} ${dataset.separator} ${affiliateLink.url}`;
            }
            count++;
        });
    }
    if (video.footnotes.length > 0) {
        content += heading(dataset.headings.footnotes);
        video.footnotes.forEach(function (footnote) {
            let emoji = "";
            if (footnote.type === "warning") {
                emoji = "⚠️ ";
            }
            if (footnote.timestamp === "") {
                content += `\n${emoji}${footnote.message}`;
            }
            else {
                content += `\n${emoji}${footnote.timestamp} ${footnote.message}`;
            }
        });
    }
    return content;
};
const preview = function (dataset, platform, video, metadata) {
    let content = `${chalk_1.default.bold(video.title)}`;
    content += `\n\n${description(dataset, platform, video)}`;
    if (metadata) {
        content += `\n\n${chalk_1.default.bold("Tags:")} ${video.tags.join(", ")}`;
    }
    console.log(content);
};
commander_1.default
    .command("preview <platform> <id>")
    .description("preview video")
    .option("--dataset <dataset>", "/path/to/tube-manager.json", path_1.default.resolve(process.cwd(), "tube-manager.json"))
    .option("--metadata", "enabled metadata preview")
    .action(async (platform, id, command) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error("Invalid platform");
        }
        const json = await readFileAsync(command.dataset, "utf8");
        const dataset = JSON.parse(json);
        let video;
        if (platform === "youtube") {
            video = dataset.videos[id];
        }
        else if (platform === "peertube") {
            const videoIds = Object.keys(dataset.videos);
            for (let index = 0; index < videoIds.length; index++) {
                const _video = dataset.videos[videoIds[index]];
                if (_video.peerTubeUuid === id) {
                    video = _video;
                    break;
                }
            }
        }
        if (!video) {
            throw new Error("Not found");
        }
        preview(dataset, platform, video, command.metadata ? command.metadata : false);
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default
    .command("publish [id]")
    .description("publish video(s)")
    .option("--dataset <dataset>", "/path/to/tube-manager.json", path_1.default.resolve(process.cwd(), "tube-manager.json"))
    .action(async (id, command) => {
    try {
        const json = await readFileAsync(command.dataset, "utf8");
        const dataset = JSON.parse(json);
        if (!id) {
            console.log("full");
        }
        else {
            const video = dataset.videos[id];
            if (!video) {
                throw new Error("Not found");
            }
            console.log("partial");
        }
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=index.js.map