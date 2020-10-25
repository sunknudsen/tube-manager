"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const p_whilst_1 = __importDefault(require("p-whilst"));
const path_1 = require("path");
const fs_1 = require("fs");
const inquirer_1 = __importDefault(require("inquirer"));
const leven_1 = __importDefault(require("leven"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const prettier_1 = __importDefault(require("prettier"));
const form_data_1 = __importDefault(require("form-data"));
const get_stream_1 = __importDefault(require("get-stream"));
const os_1 = require("os");
const config_1 = __importDefault(require("./config"));
const youtube_1 = __importDefault(require("./youtube"));
const peertube_1 = __importDefault(require("./peertube"));
const readFileAsync = util_1.promisify(fs_1.readFile);
const writeFileAsync = util_1.promisify(fs_1.writeFile);
commander_1.default
    .command("refresh-token <platform>")
    .description("get refresh token")
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .action(async (platform, command) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error(`Invalid platform "${platform}"`);
        }
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
        if (platform === "youtube") {
            let refreshToken = await youtube.getRefreshToken();
            console.log(refreshToken);
        }
        else if (platform === "peertube") {
            let refreshToken = await peertube.getRefreshToken();
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
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .action(async (platform, command) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error(`Invalid platform "${platform}"`);
        }
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
        if (platform === "youtube") {
            // See https://developers.google.com/youtube/v3/docs/channels/list
            const channelsResponse = await youtube.got.get("channels", {
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
            const meResponse = await peertube.got.get(`users/me`);
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
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .action(async (platform, command) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error(`Invalid platform "${platform}"`);
        }
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
        if (platform === "youtube") {
            // See https://developers.google.com/youtube/v3/docs/channels/list
            const channelsResponse = await youtube.got.get("channels", {
                searchParams: {
                    id: config.props.youtube.channelId,
                    part: "statistics",
                },
            });
            if (channelsResponse.body.items.length !== 1) {
                throw new Error(`Could not find YouTube channel "${config.props.youtube.channelId}"`);
            }
            const statistics = channelsResponse.body.items[0].statistics;
            console.log({
                viewCount: statistics.viewCount,
                subscriberCount: statistics.subscriberCount,
            });
        }
        else if (platform === "peertube") {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/My-User/paths/~1users~1me/get
            const meResponse = await peertube.got.get(`users/me`);
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
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .action(async (platform, id, command) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error(`Invalid platform "${platform}"`);
        }
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
        if (platform === "youtube") {
            // See https://developers.google.com/youtube/v3/docs/videos/list
            const videosResponse = await youtube.got.get("videos", {
                searchParams: {
                    id: id,
                    part: "id,snippet,processingDetails",
                },
            });
            if (videosResponse.body.items.length !== 1) {
                throw new Error("Could not find video");
            }
            console.log(util_1.inspect(videosResponse.body.items[0], false, 3, true));
        }
        else if (platform === "peertube") {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/get
            const videosResponse = await peertube.got.get(`videos/${id}`);
            console.log(videosResponse.body);
        }
    }
    catch (error) {
        console.log(error);
    }
});
const getPeerTubeVideosFromServer = async function (config, peertube) {
    let peertubeVideos = [];
    if (config.props.peertube.accountName) {
        let start = 0;
        let total = null;
        await p_whilst_1.default(() => total === null || peertubeVideos.length < total, async () => {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos/get
            const accountVideosResponse = await peertube.got.get(`accounts/${peertube.config.props.peertube.accountName}/videos`, {
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
    return peertubeVideos;
};
const getPeerTubeVideoMatchingTitle = function (peertubeVideos, title) {
    for (const peertubeVideo of peertubeVideos) {
        if (leven_1.default(title, peertubeVideo.name) < 2) {
            return peertubeVideo;
        }
    }
};
commander_1.default
    .command("initialize")
    .description("initialize dataset")
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .option("--include <include>", "include videos IDs")
    .option("--exclude <exclude>", "exclude videos IDs")
    .option("--dataset <dataset>", "/path/to/dataset.json", path_1.resolve(process.cwd(), "tube-manager.json"))
    .action(async (command) => {
    try {
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
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
            const channelsResponse = await youtube.got.get("channels", {
                searchParams: {
                    id: config.props.youtube.channelId,
                    part: "contentDetails",
                },
            });
            if (channelsResponse.body.items.length !== 1) {
                throw new Error(`Could not find YouTube channel "${config.props.youtube.channelId}"`);
            }
            const playlistId = channelsResponse.body.items[0].contentDetails.relatedPlaylists.uploads;
            let items = [];
            let pageToken = null;
            await p_whilst_1.default(() => pageToken !== undefined, async () => {
                // See https://developers.google.com/youtube/v3/docs/playlistItems/list
                const playlistItemsResponse = await youtube.got.get("playlistItems", {
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
            let videosResponse = await youtube.got.get("videos", {
                searchParams: {
                    id: slice.join(","),
                    part: "id,snippet",
                },
            });
            youtubeVideos = youtubeVideos.concat(videosResponse.body.items);
        }
        let peertubeVideos = [];
        if (peertube.config.props.peertube.accountName) {
            peertubeVideos = await getPeerTubeVideosFromServer(config, peertube);
        }
        let dataset = {
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
            videos: [],
        };
        youtubeVideos.forEach(function (youtubeVideo) {
            var _a, _b;
            let peerTubeVideo;
            if (peertube.config.props.peertube.accountName) {
                peerTubeVideo = getPeerTubeVideoMatchingTitle(peertubeVideos, youtubeVideo.snippet.title);
                if (!peerTubeVideo) {
                    console.log(chalk_1.default.red(`Could not find PeerTube video matching title "${youtubeVideo.snippet.title}"`));
                }
            }
            dataset.videos.push({
                id: youtubeVideo.id,
                peerTubeUuid: peerTubeVideo ? peerTubeVideo.uuid : null,
                publishedAt: youtubeVideo.snippet.publishedAt,
                title: youtubeVideo.snippet.title,
                description: (_a = youtubeVideo.snippet.description) !== null && _a !== void 0 ? _a : "",
                tags: (_b = youtubeVideo.snippet.tags) !== null && _b !== void 0 ? _b : [],
                categoryId: youtubeVideo.snippet.categoryId,
                sections: [],
                suggestedVideos: [],
                links: [],
                credits: [],
                affiliateLinks: [],
                footnotes: [],
            });
        });
        console.log(`Imported ${dataset.videos.length} videos to ${command.dataset}`);
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default
    .command("import <id>")
    .description("import video")
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .option("--dataset <dataset>", "/path/to/dataset.json", path_1.resolve(process.cwd(), "tube-manager.json"))
    .action(async (id, command) => {
    try {
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
        const json = await readFileAsync(command.dataset, "utf8");
        const dataset = JSON.parse(json);
        if (getYouTubeVideo(dataset, id)) {
            throw new Error("Video already in dataset");
        }
        // See https://developers.google.com/youtube/v3/docs/videos/list
        const videosResponse = await youtube.got.get("videos", {
            searchParams: {
                id: id,
                part: "id,snippet",
            },
        });
        if (videosResponse.body.items.length !== 1) {
            throw new Error("Could not find video");
        }
        const video = videosResponse.body.items[0];
        let peerTubeVideo;
        if (peertube.config.props.peertube.accountName) {
            const peertubeVideos = await getPeerTubeVideosFromServer(config, peertube);
            peerTubeVideo = getPeerTubeVideoMatchingTitle(peertubeVideos, video.snippet.title);
            if (!peerTubeVideo) {
                console.log(chalk_1.default.red(`Could not find PeerTube video matching title "${video.snippet.title}"`));
            }
        }
        dataset.videos.push({
            id: video.id,
            peerTubeUuid: peerTubeVideo ? peerTubeVideo.uuid : null,
            publishedAt: video.snippet.publishedAt,
            title: video.snippet.title,
            description: video.snippet.description,
            tags: video.snippet.tags,
            categoryId: video.snippet.categoryId,
            sections: [],
            suggestedVideos: [],
            links: [],
            credits: [],
            affiliateLinks: [],
            footnotes: [],
        });
        dataset.videos.sort(function (a, b) {
            const dateA = new Date(a.publishedAt);
            const dateB = new Date(b.publishedAt);
            if (dateA > dateB) {
                return -1;
            }
            if (dateA < dateB) {
                return 1;
            }
            return 0;
        });
        await writeFileAsync(command.dataset, prettier_1.default.format(JSON.stringify(dataset, null, 2), { parser: "json" }));
        console.log(`Imported video to ${command.dataset}`);
    }
    catch (error) {
        console.log(error);
    }
});
const getYouTubeVideo = function (dataset, id) {
    for (const video of dataset.videos) {
        if (video.id === id) {
            return video;
        }
    }
};
const getPeerTubeVideo = function (dataset, id) {
    for (const video of dataset.videos) {
        if (video.peerTubeUuid === id) {
            return video;
        }
    }
};
const heading = function (value) {
    return `\n\n==============================\n${value.toUpperCase()}\n==============================`;
};
const description = function (config, dataset, platform, video) {
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
                const suggestedVideoAttributes = getYouTubeVideo(dataset, suggestedVideoId);
                if (!suggestedVideoAttributes) {
                    throw new Error(`Could not find suggested video "${suggestedVideo}"`);
                }
                if (platform === "youtube") {
                    content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${config.props.youtube.channelWatchUrl}${suggestedVideoAttributes.id}`;
                }
                else if (platform === "peertube") {
                    let watchUrl;
                    if (suggestedVideoAttributes.peerTubeUuid === null) {
                        console.log(chalk_1.default.red(`Could not find PeerTube version of suggested video "${suggestedVideo}", using YouTube version instead`));
                        watchUrl = `${config.props.youtube.channelWatchUrl}${suggestedVideoAttributes.id}`;
                    }
                    else {
                        watchUrl = `${config.props.peertube.channelWatchUrl}${suggestedVideoAttributes.peerTubeUuid}`;
                    }
                    content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${watchUrl}`;
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
                    throw new Error(`Could not find affiliate link "${affiliateLink}"`);
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
            if (typeof footnote === "string") {
                content += `\n${footnote}`;
            }
            else {
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
            }
        });
    }
    return content;
};
const preview = function (config, dataset, platform, video, metadata) {
    let content = `${chalk_1.default.bold(video.title)}`;
    content += `\n\n${description(config, dataset, platform, video)}`;
    if (metadata) {
        content += `\n\n${chalk_1.default.bold("Tags:")} ${video.tags.join(", ")}`;
    }
    console.log(content);
};
commander_1.default
    .command("preview <platform> <id>")
    .description("preview video")
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .option("--dataset <dataset>", "/path/to/tube-manager.json", path_1.resolve(process.cwd(), "tube-manager.json"))
    .option("--metadata", "enabled metadata preview")
    .action(async (platform, id, command) => {
    try {
        if (!["youtube", "peertube"].includes(platform)) {
            throw new Error(`Invalid platform "${platform}"`);
        }
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const json = await readFileAsync(command.dataset, "utf8");
        const dataset = JSON.parse(json);
        let video;
        if (platform === "youtube") {
            video = getYouTubeVideo(dataset, id);
        }
        else if (platform === "peertube") {
            video = getPeerTubeVideo(dataset, id);
        }
        if (!video) {
            throw new Error("Could not find video");
        }
        preview(config, dataset, platform, video, command.metadata ? command.metadata : false);
    }
    catch (error) {
        console.log(error);
    }
});
const publishVideo = async function (config, youtube, peertube, dataset, video, options) {
    try {
        let json = {
            id: video.id,
            snippet: {
                title: video.title,
                description: description(config, dataset, "youtube", video),
                tags: video.tags,
                categoryId: video.categoryId,
            },
        };
        if (options.public === true) {
            json.status = {
                privacyStatus: "public",
            };
        }
        // See https://developers.google.com/youtube/v3/docs/videos/update
        const videosResponse = await youtube.got.put("videos", {
            searchParams: {
                part: "snippet,status",
            },
            json: json,
        });
        const privacyStatus = videosResponse.body.status.privacyStatus;
        const getPrivacy = function (privacyStatus) {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/get
            if (privacyStatus === "public") {
                return 1;
            }
            else if (privacyStatus === "unlisted") {
                return 2;
            }
            else if (privacyStatus === "private") {
                return 3;
            }
            else {
                throw new Error(`Invalid privacy status "${privacyStatus}"`);
            }
        };
        console.log(`Published video to ${config.props.youtube.channelWatchUrl}${video.id}`);
        if (video.peerTubeUuid !== null) {
            const form = new form_data_1.default();
            form.append("name", video.title);
            form.append("description", description(config, dataset, "peertube", video));
            form.append("privacy", getPrivacy(privacyStatus));
            video.tags.slice(0, 5).forEach(function (tag, index) {
                form.append(`tags[${index}]`, tag);
            });
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/put
            await peertube.got.put(`videos/${video.peerTubeUuid}`, {
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`,
                },
                body: await get_stream_1.default(form),
            });
            console.log(`Published video to ${config.props.peertube.channelWatchUrl}${video.peerTubeUuid}`);
        }
        else if (video.peerTubeUuid === null &&
            peertube.config.props.peertube.accountName) {
            const values = await inquirer_1.default.prompt({
                type: "confirm",
                name: "confirmation",
                message: `Do you wish to publish video to PeerTube?`,
            });
            if (values.confirmation === true) {
                // Make sure YouTube video has been processed
                // See https://developers.google.com/youtube/v3/docs/channels/list
                const videosResponse = await youtube.got.get("videos", {
                    searchParams: {
                        id: video.id,
                        part: "id,processingDetails",
                    },
                });
                if (videosResponse.body.items.length !== 1) {
                    throw new Error("Could not find video");
                }
                const processingDetails = videosResponse.body.items[0].processingDetails;
                if (processingDetails.processingStatus !== "succeeded" ||
                    processingDetails.thumbnailsAvailability !== "available") {
                    console.log(`Video not available, try again in a few minutes`);
                }
                else {
                    const form = new form_data_1.default();
                    form.append("channelId", config.props.peertube.channelId);
                    form.append("name", video.title);
                    form.append("privacy", getPrivacy(privacyStatus));
                    form.append("targetUrl", `${config.props.youtube.channelWatchUrl}${video.id}`);
                    // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1imports/post
                    const videosResponse = await peertube.got.post(`videos/imports`, {
                        body: await get_stream_1.default(form),
                    });
                    video.peerTubeUuid = videosResponse.body.video.uuid;
                    console.log(`Published video to ${config.props.peertube.channelWatchUrl}${video.peerTubeUuid}`);
                }
            }
        }
    }
    catch (error) {
        throw error;
    }
};
commander_1.default
    .command("publish [id]")
    .description("publish video(s)")
    .option("--config <config>", "/path/to/config.json", path_1.resolve(os_1.homedir(), ".tube-manager/config.json"))
    .option("--profile <profile>", "configuration profile", "default")
    .option("--dataset <dataset>", "/path/to/tube-manager.json", path_1.resolve(process.cwd(), "tube-manager.json"))
    .option("--public")
    .action(async (id, command) => {
    try {
        const config = new config_1.default(command.config, command.profile);
        await config.load();
        const youtube = new youtube_1.default(config);
        const peertube = new peertube_1.default(config);
        const json = await readFileAsync(command.dataset, "utf8");
        const dataset = JSON.parse(json);
        const options = {
            public: command.public,
        };
        if (!id) {
            const values = await inquirer_1.default.prompt({
                type: "confirm",
                name: "confirmation",
                message: `Are you sure you wish to publish all videos?`,
            });
            if (values.confirmation !== true) {
                process.exit(0);
            }
            console.log("Publishing all videos...");
            for (const video of dataset.videos) {
                await publishVideo(config, youtube, peertube, dataset, video, options);
            }
        }
        else {
            const video = getYouTubeVideo(dataset, id);
            if (!video) {
                throw new Error("Could not find video");
            }
            await publishVideo(config, youtube, peertube, dataset, video, options);
            // Find suggested videos that reference video
            let suggestedVideoIds = [];
            dataset.videos.forEach(function (video) {
                video.suggestedVideos.forEach(function (suggestedVideo) {
                    if (typeof suggestedVideo === "string" &&
                        suggestedVideo.match(id)) {
                        suggestedVideoIds.push(video.id);
                    }
                });
            });
            if (suggestedVideoIds.length > 0) {
                console.log("Publishing suggested videos that reference video...");
                for (const suggestedVideoId of suggestedVideoIds) {
                    const video = getYouTubeVideo(dataset, suggestedVideoId);
                    if (!video) {
                        throw new Error("Could not find video");
                    }
                    await publishVideo(config, youtube, peertube, dataset, video, options);
                }
            }
        }
        await writeFileAsync(command.dataset, prettier_1.default.format(JSON.stringify(dataset, null, 2), { parser: "json" }));
        console.log("Done");
    }
    catch (error) {
        console.log(error);
    }
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=index.js.map