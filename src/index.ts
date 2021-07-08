"use strict"

import { program } from "commander"
import pWhilst from "p-whilst"
import { join, resolve } from "path"
import fsExtra from "fs-extra"
import inquirer from "inquirer"
import hasha from "hasha"
import leven from "leven"
import { inspect } from "util"
import chalk from "chalk"
import prettier from "prettier"
import formData from "form-data"
import { homedir } from "os"
import { HTTPError } from "got"
import Config from "./config.js"
import YouTube from "./youtube.js"
import PeerTube from "./peertube.js"

const {
  createReadStream,
  existsSync,
  readFile,
  writeFile,
  emptyDir,
  ensureDir,
} = fsExtra

const logError = function (error: Error | HTTPError) {
  if (error instanceof HTTPError) {
    console.error(
      inspect(
        {
          request: {
            method: error.response.request.options.method,
            url: error.response.request.options.url.href,
            headers: error.response.request.options.headers,
            json: error.response.request.options.json,
            body: error.response.request.options.body,
          },
          response: {
            statusCode: error.response.statusCode,
            body: error.response.body,
          },
        },
        false,
        4,
        true
      )
    )
  } else {
    console.error(error)
  }
}

type Section = {
  label: string
  timestamp: number
}

type Snippet =
  | string
  | {
      label: string
      url: string
    }

type AffiliateSnippet =
  | Snippet
  | {
      label: string
      url: Snippet[]
    }

type Footnote = {
  type: "" | "warning"
  timestamp: string
  message: string
}

interface Video {
  id: string
  peerTubeUuid: string
  publishedAt: string
  title: string
  description: string
  tags: string[]
  categoryId: string
  sections: Section[]
  suggestedVideos: Snippet[]
  links: Snippet[]
  credits: Snippet[]
  affiliateLinks: AffiliateSnippet[]
  footnotes: Footnote[]
  support: Snippet[]
  thumbnailHash?: string
}

interface Dataset {
  headings: {
    sections: string
    suggestedVideos: string
    links: string
    credits: string
    affiliateLinks: string
    footnotes: string
    support: string
  }
  separator: string
  affiliateLinks: {
    [key: string]: {
      [key: string]: AffiliateSnippet
    }
  }
  videos: Video[]
}

program
  .command("refresh-token <platform>")
  .description("get refresh token")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .action(async (platform, command) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error(`Invalid platform "${platform}"`)
      }
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      if (platform === "youtube") {
        let refreshToken = await youtube.getRefreshToken()
        console.info(refreshToken)
      } else if (platform === "peertube") {
        let refreshToken = await peertube.getRefreshToken()
        console.info(refreshToken)
      }
    } catch (error) {
      logError(error)
    }
  })

program
  .command("channels <platform>")
  .description("get channels")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .action(async (platform, command) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error(`Invalid platform "${platform}"`)
      }
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      if (platform === "youtube") {
        // See https://developers.google.com/youtube/v3/docs/channels/list
        const channelsResponse: any = await youtube.got.get("channels", {
          searchParams: {
            part: "id,snippet",
            mine: true,
          },
        })
        let channels: any[] = []
        channelsResponse.body.items.forEach(function (item: any) {
          channels.push({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
          })
        })
        console.info(channels)
      } else if (platform === "peertube") {
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/My-User/paths/~1users~1me/get
        const meResponse: any = await peertube.got.get(`users/me`)
        let channels: any[] = []
        meResponse.body.videoChannels.forEach(function (videoChannel: any) {
          channels.push({
            id: videoChannel.id,
            name: videoChannel.name,
            description: videoChannel.description,
          })
        })
        console.info(channels)
      }
    } catch (error) {
      logError(error)
    }
  })

program
  .command("stats <platform>")
  .description("get stats")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .action(async (platform, command) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error(`Invalid platform "${platform}"`)
      }
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      if (platform === "youtube") {
        // See https://developers.google.com/youtube/v3/docs/channels/list
        const channelsResponse: any = await youtube.got.get("channels", {
          searchParams: {
            id: config.props.youtube.channelId,
            part: "statistics",
          },
        })
        if (channelsResponse.body.items.length !== 1) {
          throw new Error(
            `Could not find YouTube channel "${config.props.youtube.channelId}"`
          )
        }
        const statistics = channelsResponse.body.items[0].statistics
        console.info({
          viewCount: statistics.viewCount,
          subscriberCount: statistics.subscriberCount,
        })
      } else if (platform === "peertube") {
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/My-User/paths/~1users~1me/get
        const meResponse: any = await peertube.got.get(`users/me`)
        let stats: any = {
          account: {
            followersCount: meResponse.body.account.followersCount,
          },
          videoChannels: [],
        }
        meResponse.body.videoChannels.forEach(function (videoChannel: any) {
          stats.videoChannels.push({
            displayName: videoChannel.displayName,
            followersCount: videoChannel.followersCount,
          })
        })
        console.info(stats)
      }
    } catch (error) {
      logError(error)
    }
  })

program
  .command("video <platform> <id>")
  .description("get video")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .action(async (platform, id, command) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error(`Invalid platform "${platform}"`)
      }
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      if (platform === "youtube") {
        // See https://developers.google.com/youtube/v3/docs/videos/list
        const videosResponse: any = await youtube.got.get("videos", {
          searchParams: {
            id: id,
            part: "id,snippet,processingDetails",
          },
        })
        if (videosResponse.body.items.length !== 1) {
          throw new Error("Could not find video")
        }
        console.info(inspect(videosResponse.body.items[0], false, 3, true))
      } else if (platform === "peertube") {
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/get
        const videosResponse: any = await peertube.got.get(`videos/${id}`)
        console.info(inspect(videosResponse.body, false, 5, true))
      }
    } catch (error) {
      logError(error)
    }
  })

const getPeerTubeVideosFromServer = async function (
  config: Config,
  peertube: PeerTube
) {
  let peertubeVideos: any[] = []
  if (config.props.peertube.accountName) {
    let start = 0
    let total: null | number = null
    await pWhilst(
      () => total === null || peertubeVideos.length < total,
      async () => {
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos/get
        const accountVideosResponse: any = await peertube.got.get(
          `accounts/${peertube.config.props.peertube.accountName}/videos`,
          {
            searchParams: {
              count: 50,
              start: start,
            },
          }
        )
        peertubeVideos = peertubeVideos.concat(accountVideosResponse.body.data)
        total = accountVideosResponse.body.total
        start = peertubeVideos.length
      }
    )
  }
  return peertubeVideos
}

const getPeerTubeVideoMatchingTitle = function (
  peertubeVideos: any[],
  title: string
): any {
  for (const peertubeVideo of peertubeVideos) {
    if (leven(title, peertubeVideo.name) < 2) {
      return peertubeVideo
    }
  }
}

program
  .command("initialize")
  .description("initialize dataset")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .option("--include <include>", "include videos IDs")
  .option("--exclude <exclude>", "exclude videos IDs")
  .option(
    "--dataset <dataset>",
    "/path/to/dataset.json",
    resolve(process.cwd(), "tube-manager.json")
  )
  .option(
    "--thumbnail-dir <dir>",
    "/path/to/tube-manager",
    resolve(process.cwd(), "tube-manager")
  )
  .action(async (command) => {
    try {
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      if (existsSync(command.dataset)) {
        const values = await inquirer.prompt({
          type: "confirm",
          name: "confirmation",
          message: `Do you wish to override ${chalk.bold(command.dataset)}?`,
        })
        if (values.confirmation !== true) {
          console.info(chalk.red("Cancelled"))
          process.exit(0)
        }
      }
      if (existsSync(command.thumbnailDir)) {
        const values = await inquirer.prompt({
          type: "confirm",
          name: "confirmation",
          message: `Do you wish to purge ${chalk.bold(command.thumbnailDir)}?`,
        })
        if (values.confirmation !== true) {
          console.info(chalk.red("Cancelled"))
          process.exit(0)
        }
        await emptyDir(command.thumbnailDir)
      } else {
        await ensureDir(command.thumbnailDir)
      }
      let ids: string[]
      if (command.include) {
        ids = command.include.replace(/ /g, "").split(",")
      } else {
        ids = []
        // See https://developers.google.com/youtube/v3/docs/channels/list
        const channelsResponse: any = await youtube.got.get("channels", {
          searchParams: {
            id: config.props.youtube.channelId,
            part: "contentDetails",
          },
        })
        if (channelsResponse.body.items.length !== 1) {
          throw new Error(
            `Could not find YouTube channel "${config.props.youtube.channelId}"`
          )
        }
        const playlistId =
          channelsResponse.body.items[0].contentDetails.relatedPlaylists.uploads
        let items: any[] = []
        let pageToken: null | string = null
        await pWhilst(
          () => pageToken !== undefined,
          async () => {
            // See https://developers.google.com/youtube/v3/docs/playlistItems/list
            const playlistItemsResponse: any = await youtube.got.get(
              "playlistItems",
              {
                searchParams: {
                  playlistId: playlistId,
                  part: "id,snippet",
                  maxResults: "50",
                  pageToken: pageToken,
                },
              }
            )
            pageToken = playlistItemsResponse.body.nextPageToken
            playlistItemsResponse.body.items.forEach(function (item: any) {
              items.push(item)
            })
          }
        )
        items.forEach(function (item) {
          if (command.exclude) {
            const excluded = command.exclude.replace(/ /g, "").split(",")
            if (excluded.indexOf(item.snippet.resourceId.videoId) === -1) {
              ids.push(item.snippet.resourceId.videoId)
            }
          } else {
            ids.push(item.snippet.resourceId.videoId)
          }
        })
      }
      let youtubeVideos: any[] = []
      const chunk = 50
      for (let index = 0; index < ids.length; index += chunk) {
        let slice = ids.slice(index, index + chunk)
        // See https://developers.google.com/youtube/v3/docs/videos/list
        let videosResponse: any = await youtube.got.get("videos", {
          searchParams: {
            id: slice.join(","),
            part: "id,snippet",
          },
        })
        youtubeVideos = youtubeVideos.concat(videosResponse.body.items)
      }
      let peertubeVideos: any[] = []
      if (peertube.config.props.peertube.accountName) {
        peertubeVideos = await getPeerTubeVideosFromServer(config, peertube)
      }
      let headings: Dataset["headings"] = {
        sections: "Sections",
        suggestedVideos: "Suggested",
        links: "Links",
        credits: "Credits",
        affiliateLinks: "Affiliate links",
        footnotes: "Footnotes",
        support: "Support",
      }
      let dataset: any = {
        headings: headings,
        separator: "👉",
        affiliateLinks: {
          amazon: {},
        },
        videos: [],
      }
      for (const youtubeVideo of youtubeVideos) {
        let peerTubeVideo: any
        if (peertube.config.props.peertube.accountName) {
          peerTubeVideo = getPeerTubeVideoMatchingTitle(
            peertubeVideos,
            youtubeVideo.snippet.title
          )
          if (!peerTubeVideo) {
            console.info(
              chalk.yellow(
                `Could not find PeerTube video matching title ${chalk.bold(
                  youtubeVideo.snippet.title
                )}`
              )
            )
          }
        }
        let video: Video = {
          id: youtubeVideo.id,
          peerTubeUuid: peerTubeVideo ? peerTubeVideo.uuid : null,
          publishedAt: youtubeVideo.snippet.publishedAt,
          title: youtubeVideo.snippet.title,
          description: youtubeVideo.snippet.description ?? "",
          tags: youtubeVideo.snippet.tags ?? [],
          categoryId: youtubeVideo.snippet.categoryId,
          sections: [],
          suggestedVideos: [],
          links: [],
          credits: [],
          affiliateLinks: [],
          footnotes: [],
          support: [],
        }
        dataset.videos.push(video)
      }
      await writeFile(
        command.dataset,
        prettier.format(JSON.stringify(dataset, null, 2), { parser: "json" })
      )
      console.info(
        chalk.green(
          `Imported ${chalk.bold(dataset.videos.length)} videos to ${chalk.bold(
            command.dataset
          )}`
        )
      )
    } catch (error) {
      logError(error)
    }
  })

program
  .command("import <id>")
  .description("import video")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .option(
    "--dataset <dataset>",
    "/path/to/dataset.json",
    resolve(process.cwd(), "tube-manager.json")
  )
  .action(async (id, command) => {
    try {
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      const json = await readFile(command.dataset, "utf8")
      const dataset: Dataset = JSON.parse(json)
      if (getYouTubeVideo(dataset, id)) {
        throw new Error("Video already in dataset")
      }
      // See https://developers.google.com/youtube/v3/docs/videos/list
      const videosResponse: any = await youtube.got.get("videos", {
        searchParams: {
          id: id,
          part: "id,snippet",
        },
      })
      if (videosResponse.body.items.length !== 1) {
        throw new Error("Could not find video")
      }
      const video = videosResponse.body.items[0]
      let peerTubeVideo: any
      if (peertube.config.props.peertube.accountName) {
        const peertubeVideos = await getPeerTubeVideosFromServer(
          config,
          peertube
        )
        peerTubeVideo = getPeerTubeVideoMatchingTitle(
          peertubeVideos,
          video.snippet.title
        )
        if (!peerTubeVideo) {
          console.info(
            chalk.yellow(
              `Could not find PeerTube video matching title ${chalk.bold(
                video.snippet.title
              )}`
            )
          )
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
        support: [],
      })
      dataset.videos.sort(function (a, b) {
        const dateA = new Date(a.publishedAt)
        const dateB = new Date(b.publishedAt)
        if (dateA > dateB) {
          return -1
        }
        if (dateA < dateB) {
          return 1
        }
        return 0
      })
      await writeFile(
        command.dataset,
        prettier.format(JSON.stringify(dataset, null, 2), { parser: "json" })
      )
      console.info(
        chalk.green(`Imported video to ${chalk.bold(command.dataset)}`)
      )
    } catch (error) {
      logError(error)
    }
  })

const getYouTubeVideo = function (dataset: Dataset, id: string): Video {
  for (const video of dataset.videos) {
    if (video.id === id) {
      return video
    }
  }
}

const getPeerTubeVideo = function (dataset: Dataset, id: string): Video {
  for (const video of dataset.videos) {
    if (video.peerTubeUuid === id) {
      return video
    }
  }
}

const heading = function (value: string) {
  return `\n\n==============================\n${value.toUpperCase()}\n==============================`
}

const support = function (dataset: Dataset, video: Video) {
  let content = ""
  video.support.forEach(function (means) {
    if (typeof means === "string") {
      content += `\n${means}`
    } else {
      content += `\n${means.label} ${dataset.separator} ${means.url}`
    }
  })
  return content
}

const description = function (
  config: Config,
  dataset: Dataset,
  platform: string,
  video: Video
) {
  let content = video.description
  if (video.sections.length > 0) {
    content += heading(dataset.headings.sections)
    video.sections.forEach(function (section) {
      content += `\n${section.timestamp} ${section.label}`
    })
  }
  if (video.suggestedVideos.length > 0) {
    content += heading(dataset.headings.suggestedVideos)
    video.suggestedVideos.forEach(function (suggestedVideo) {
      if (
        typeof suggestedVideo === "string" &&
        suggestedVideo.match(/^video\.[a-zA-Z0-9_\-]{11}/)
      ) {
        const suggestedVideoId = suggestedVideo.split(".")[1]
        const suggestedVideoAttributes = getYouTubeVideo(
          dataset,
          suggestedVideoId
        )
        if (!suggestedVideoAttributes) {
          throw new Error(`Could not find suggested video "${suggestedVideo}"`)
        }
        if (platform === "youtube") {
          content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${config.props.youtube.channelWatchUrl}${suggestedVideoAttributes.id}`
        } else if (platform === "peertube") {
          let watchUrl: string
          if (suggestedVideoAttributes.peerTubeUuid === null) {
            console.info(
              chalk.red(
                `Could not find PeerTube version of suggested video ${chalk.bold(
                  suggestedVideo
                )} (using YouTube version)`
              )
            )
            watchUrl = `${config.props.youtube.channelWatchUrl}${suggestedVideoAttributes.id}`
          } else {
            watchUrl = `${config.props.peertube.channelWatchUrl}${suggestedVideoAttributes.peerTubeUuid}`
          }
          content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${watchUrl}`
        }
      } else if (typeof suggestedVideo === "string") {
        content += `\n${suggestedVideo}`
      } else {
        content += `\n${suggestedVideo.label} ${dataset.separator} ${suggestedVideo.url}`
      }
    })
  }
  if (video.links.length > 0) {
    content += heading(dataset.headings.links)
    video.links.forEach(function (link) {
      if (typeof link === "string") {
        content += `\n${link}`
      } else {
        content += `\n${link.label} ${dataset.separator} ${link.url}`
      }
    })
  }
  if (video.credits.length > 0) {
    content += heading(dataset.headings.credits)
    video.credits.forEach(function (credit) {
      if (typeof credit === "string") {
        content += `\n${credit}`
      } else {
        content += `\n${credit.label} ${dataset.separator} ${credit.url}`
      }
    })
  }
  if (video.affiliateLinks.length > 0) {
    content += heading(dataset.headings.affiliateLinks)
    let count = 0
    video.affiliateLinks.forEach(function (affiliateLink) {
      if (
        typeof affiliateLink === "string" &&
        affiliateLink.match(/^(\w+?)\.(\w+?)$/)
      ) {
        const affiliateLinkMatch = affiliateLink.match(/^(\w+?)\.(\w+?)$/)
        const affiliateLinkAttributes =
          dataset.affiliateLinks[affiliateLinkMatch[1]][affiliateLinkMatch[2]]
        if (!affiliateLinkAttributes) {
          throw new Error(`Could not find affiliate link "${affiliateLink}"`)
        }
        if (typeof affiliateLinkAttributes === "string") {
          content += `\n${affiliateLinkAttributes}`
        } else if (affiliateLinkAttributes.url instanceof Array) {
          if (count !== 0) {
            content += "\n"
          }
          content += `\n${affiliateLinkAttributes.label}`
          affiliateLinkAttributes.url.forEach(function (_url) {
            if (typeof _url === "string") {
              content += `\n${_url}`
            } else {
              content += `\n${_url.label} ${dataset.separator} ${_url.url}`
            }
          })
        } else {
          content += `\n${affiliateLinkAttributes.label} ${dataset.separator} ${affiliateLinkAttributes.url}`
        }
      } else if (typeof affiliateLink === "string") {
        content += `\n${affiliateLink}`
      } else if (affiliateLink.url instanceof Array) {
        if (count !== 0) {
          content += "\n"
        }
        content += `\n${affiliateLink.label}`
        affiliateLink.url.forEach(function (_url) {
          if (typeof _url === "string") {
            content += `\n${_url}`
          } else {
            content += `\n${_url.label} ${dataset.separator} ${_url.url}`
          }
        })
      } else {
        content += `\n${affiliateLink.label} ${dataset.separator} ${affiliateLink.url}`
      }
      count++
    })
  }
  if (video.footnotes.length > 0) {
    content += heading(dataset.headings.footnotes)
    video.footnotes.forEach(function (footnote) {
      if (typeof footnote === "string") {
        content += `\n${footnote}`
      } else {
        let emoji = ""
        if (footnote.type === "warning") {
          emoji = "⚠️ "
        }
        if (footnote.timestamp === "") {
          content += `\n${emoji}${footnote.message}`
        } else {
          content += `\n${emoji}${footnote.timestamp} ${footnote.message}`
        }
      }
    })
  }
  if (video.support.length > 0) {
    content += heading(dataset.headings.support)
    content += support(dataset, video)
  }
  return content
}

const preview = function (
  config: Config,
  dataset: Dataset,
  platform: string,
  video: Video,
  metadata: boolean
) {
  let content = `${chalk.bold(video.title)}`
  content += `\n\n${description(config, dataset, platform, video)}`
  if (metadata) {
    content += `\n\n${chalk.bold("Tags:")} ${video.tags.join(", ")}`
  }
  console.info(content)
}

program
  .command("preview <platform> <id>")
  .description("preview video")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .option(
    "--dataset <dataset>",
    "/path/to/tube-manager.json",
    resolve(process.cwd(), "tube-manager.json")
  )
  .option("--metadata", "enabled metadata preview")
  .action(async (platform, id, command) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error(`Invalid platform "${platform}"`)
      }
      const config = new Config(command.config, command.profile)
      await config.load()
      const json = await readFile(command.dataset, "utf8")
      const dataset = JSON.parse(json)
      let video
      if (platform === "youtube") {
        video = getYouTubeVideo(dataset, id)
      } else if (platform === "peertube") {
        video = getPeerTubeVideo(dataset, id)
      }
      if (!video) {
        throw new Error("Could not find video")
      }
      preview(
        config,
        dataset,
        platform,
        video,
        command.metadata ? command.metadata : false
      )
    } catch (error) {
      logError(error)
    }
  })

interface PublishOptions {
  public: boolean
  publishRelated: boolean
  youtubeCheck: boolean
}

const publishVideo = async function (
  config: Config,
  youtube: YouTube,
  peertube: PeerTube,
  dataset: Dataset,
  thumbnailDir: string,
  video: Video,
  options: PublishOptions
) {
  let json: any = {
    id: video.id,
    snippet: {
      title: video.title,
      description: description(config, dataset, "youtube", video),
      tags: video.tags,
      categoryId: video.categoryId,
    },
  }
  if (options.public === true) {
    json.status = {
      privacyStatus: "public",
    }
  }
  let updatedThumbnailHash: string
  const thumbnail = join(thumbnailDir, `${video.id}.jpg`)
  if (existsSync(thumbnail)) {
    const thumbnailHash = await hasha.fromFile(thumbnail, {
      algorithm: "sha256",
    })
    if (!video.thumbnailHash || video.thumbnailHash !== thumbnailHash) {
      updatedThumbnailHash = thumbnailHash
    }
  }
  // See https://developers.google.com/youtube/v3/docs/videos/update
  const videosResponse: any = await youtube.got.put("videos", {
    searchParams: {
      part: "snippet,status",
    },
    json: json,
  })
  // Upload thumbnail to YouTube (if present or has changed)
  if (updatedThumbnailHash) {
    // See https://developers.google.com/youtube/v3/docs/thumbnails/set
    const thumbnailsResponse: any = await youtube.got.post("thumbnails/set", {
      prefixUrl: config.props.youtube.apiPrefixUrl.replace(
        "youtube",
        "upload/youtube"
      ),
      searchParams: {
        videoId: video.id,
      },
      body: await readFile(thumbnail),
    })
  }
  console.info(
    chalk.green(
      `Published video to ${chalk.bold(
        `${config.props.youtube.channelWatchUrl}${video.id}`
      )}`
    )
  )
  const privacyStatus = videosResponse.body.status.privacyStatus
  const getPrivacy = function (
    privacyStatus: "private" | "public" | "unlisted"
  ) {
    // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/get
    if (privacyStatus === "public") {
      return 1
    } else if (privacyStatus === "unlisted") {
      return 2
    } else if (privacyStatus === "private") {
      return 3
    } else {
      throw new Error(`Invalid privacy status "${privacyStatus}"`)
    }
  }
  if (video.peerTubeUuid !== null) {
    const genForm = async () => {
      const form = new formData()
      form.append("name", video.title)
      form.append(
        "description",
        description(config, dataset, "peertube", video)
      )
      form.append("privacy", getPrivacy(privacyStatus))
      form.append("support", support(dataset, video))
      video.tags.slice(0, 5).forEach(function (tag, index) {
        form.append(`tags[${index}]`, tag)
      })
      // Upload thumbnail to PeerTube (if present or has changed)
      if (updatedThumbnailHash) {
        form.append("previewfile", createReadStream(thumbnail))
        form.append("thumbnailfile", createReadStream(thumbnail))
      }
      return form
    }
    const form = await genForm()
    // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/put
    await peertube.got.put(`videos/${video.peerTubeUuid}`, {
      headers: form.getHeaders(),
      body: form,
      hooks: {
        beforeRetry: [
          async (options) => {
            const form = await genForm()
            options.body = form
            options.headers[
              "content-type"
            ] = `multipart/form-data; boundary=${form.getBoundary()}`
          },
        ],
      },
    })
    console.info(
      chalk.green(
        `Published video to ${chalk.bold(
          `${config.props.peertube.channelWatchUrl}${video.peerTubeUuid}`
        )}`
      )
    )
  } else if (
    peertube.config.props.peertube.accountName &&
    video.peerTubeUuid === null
  ) {
    const values = await inquirer.prompt({
      type: "confirm",
      name: "confirmation",
      message: "Do you wish to publish video to PeerTube?",
    })
    if (values.confirmation === true) {
      // Make sure YouTube video has been processed
      // See https://developers.google.com/youtube/v3/docs/channels/list
      const videosResponse: any = await youtube.got.get("videos", {
        searchParams: {
          id: video.id,
          part: "id,processingDetails",
        },
      })
      if (videosResponse.body.items.length !== 1) {
        throw new Error("Could not find video")
      }
      const processingDetails = videosResponse.body.items[0].processingDetails
      if (
        options.youtubeCheck === true &&
        (["succeeded", "terminated"].includes(
          processingDetails.processingStatus
        ) === false ||
          processingDetails.thumbnailsAvailability !== "available")
      ) {
        console.info(
          chalk.yellow("Video not processed, try again in a few minutes")
        )
      } else {
        const genForm = async () => {
          const form = new formData()
          form.append("channelId", config.props.peertube.channelId)
          form.append("name", video.title)
          form.append(
            "description",
            description(config, dataset, "peertube", video)
          )
          form.append("privacy", getPrivacy(privacyStatus))
          form.append("support", support(dataset, video))
          video.tags.slice(0, 5).forEach(function (tag, index) {
            form.append(`tags[${index}]`, tag)
          })
          form.append(
            "targetUrl",
            `${config.props.youtube.channelWatchUrl}${video.id}`
          )
          // Upload thumbnail to PeerTube (if present or has changed)
          if (updatedThumbnailHash) {
            form.append("previewfile", createReadStream(thumbnail))
            form.append("thumbnailfile", await readFile(thumbnail))
          }
          return form
        }
        const form = await genForm()
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1imports/post
        const videosResponse: any = await peertube.got.post(`videos/imports`, {
          headers: form.getHeaders(),
          body: form,
          hooks: {
            beforeRetry: [
              async (options) => {
                const form = await genForm()
                options.body = form
                options.headers[
                  "content-type"
                ] = `multipart/form-data; boundary=${form.getBoundary()}`
              },
            ],
          },
        })
        video.peerTubeUuid = videosResponse.body.video.uuid
        console.info(
          chalk.green(
            `Published video to ${chalk.bold(
              `${config.props.peertube.channelWatchUrl}${video.peerTubeUuid}`
            )}`
          )
        )
      }
    }
  }
  // Save thumbnail hash to dataset (if present or has changed)
  if (updatedThumbnailHash) {
    video.thumbnailHash = updatedThumbnailHash
  }
}

program
  .command("publish [id]")
  .description("publish video(s)")
  .option(
    "--config <config>",
    "/path/to/config.json",
    resolve(homedir(), ".tube-manager/config.json")
  )
  .option("--profile <profile>", "configuration profile", "default")
  .option(
    "--dataset <dataset>",
    "/path/to/tube-manager.json",
    resolve(process.cwd(), "tube-manager.json")
  )
  .option(
    "--thumbnail-dir <dir>",
    "/path/to/tube-manager",
    resolve(process.cwd(), "tube-manager")
  )
  .option("--public", "make video(s) public")
  .option("--no-publish-related", "do not publish related video(s)")
  .option(
    "--no-youtube-check",
    "publish video to PeerTube even when reported as not processed by YouTube"
  )
  .action(async (id, command) => {
    try {
      const config = new Config(command.config, command.profile)
      await config.load()
      const youtube = new YouTube(config)
      const peertube = new PeerTube(config)
      const json = await readFile(command.dataset, "utf8")
      const dataset: Dataset = JSON.parse(json)
      const thumbnailDir = command.thumbnailDir
      const options: PublishOptions = {
        public: command.public,
        publishRelated: command.publishRelated,
        youtubeCheck: command.youtubeCheck,
      }
      if (!id) {
        const values = await inquirer.prompt({
          type: "confirm",
          name: "confirmation",
          message: `Are you sure you wish to publish all videos?`,
        })
        if (values.confirmation !== true) {
          process.exit(0)
        }
        console.info("Publishing all videos...")
        for (const video of dataset.videos) {
          await publishVideo(
            config,
            youtube,
            peertube,
            dataset,
            thumbnailDir,
            video,
            options
          )
        }
      } else {
        const video = getYouTubeVideo(dataset, id)
        if (!video) {
          throw new Error("Could not find video")
        }
        await publishVideo(
          config,
          youtube,
          peertube,
          dataset,
          thumbnailDir,
          video,
          options
        )
        if (options.publishRelated === true) {
          // Find suggested videos that reference video
          let relatedVideoIds: string[] = []
          dataset.videos.forEach(function (video) {
            video.suggestedVideos.forEach(function (suggestedVideo) {
              if (
                typeof suggestedVideo === "string" &&
                suggestedVideo.match(id)
              ) {
                relatedVideoIds.push(video.id)
              }
            })
          })
          if (relatedVideoIds.length > 0) {
            console.info("Publishing related videos...")
            for (const suggestedVideoId of relatedVideoIds) {
              const video = getYouTubeVideo(dataset, suggestedVideoId)
              if (!video) {
                throw new Error("Could not find video")
              }
              await publishVideo(
                config,
                youtube,
                peertube,
                dataset,
                thumbnailDir,
                video,
                options
              )
            }
          }
        }
      }
      await writeFile(
        command.dataset,
        prettier.format(JSON.stringify(dataset, null, 2), { parser: "json" })
      )
      console.info("Done")
    } catch (error) {
      logError(error)
    }
  })

program.parse(process.argv)
