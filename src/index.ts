"use strict"

import dotenv from "dotenv"
import program from "commander"
import pWhilst from "p-whilst"
import youtubeClient, {
  getRefreshToken as getYouTubeRefreshToken,
} from "./youtube"
import peertubeClient, {
  getRefreshToken as getPeerTubeRefreshToken,
} from "./peertube"
import path from "path"
import { existsSync, readFile, writeFile } from "fs"
import inquirer from "inquirer"
import leven from "leven"
import { promisify, inspect } from "util"
import got from "got"
import chalk from "chalk"

dotenv.config()

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

program
  .command("refresh-token <platform>")
  .description("get refresh token")
  .action(async (platform) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error("Invalid platform")
      }
      if (platform === "youtube") {
        let refreshToken = await getYouTubeRefreshToken()
        console.log(refreshToken)
      } else if (platform === "peertube") {
        let refreshToken = await getPeerTubeRefreshToken()
        console.log(refreshToken)
      }
    } catch (error) {
      console.log(error)
    }
  })

program
  .command("stats <platform>")
  .description("get stats")
  .action(async (platform) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error("Invalid platform")
      }
      if (platform === "youtube") {
        // See https://developers.google.com/youtube/v3/docs/channels/list
        const channelsResponse: any = await youtubeClient.get("channels", {
          searchParams: {
            id: process.env.YOUTUBE_CHANNEL_ID,
            part: "statistics",
          },
        })
        if (channelsResponse.body.items.length !== 1) {
          throw new Error("Could not find channel")
        }
        const statistics = channelsResponse.body.items[0].statistics
        console.log({
          viewCount: statistics.viewCount,
          subscriberCount: statistics.subscriberCount,
        })
      } else if (platform === "peertube") {
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/My-User/paths/~1users~1me/get
        const meResponse: any = await peertubeClient.get(`users/me`)
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
        console.log(stats)
      }
    } catch (error) {
      console.log(error)
    }
  })

program
  .command("video <platform> <id>")
  .description("get video")
  .action(async (platform, id) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error("Invalid platform")
      }
      if (platform === "youtube") {
        // See https://developers.google.com/youtube/v3/docs/videos/list
        const videosResponse: any = await youtubeClient.get("videos", {
          searchParams: {
            id: id,
            part: "id,snippet",
          },
        })
        console.log(inspect(videosResponse.body.items[0], false, 3, true))
      } else if (platform === "peertube") {
        // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos~1{id}/get
        const videosResponse: any = await peertubeClient.get(`videos/${id}`)
        console.log(videosResponse.body)
      }
    } catch (error) {
      console.log(error)
    }
  })

program
  .command("initialize")
  .description("initialize tube manager")
  .option("--include <include>", "include videos IDs")
  .option("--exclude <exclude>", "exclude videos IDs")
  .option(
    "--dataset <dataset>",
    "/path/to/dataset.json",
    path.resolve(process.cwd(), "tube-manager.json")
  )
  .action(async (command) => {
    try {
      if (existsSync(command.dataset)) {
        const values = await inquirer.prompt({
          type: "confirm",
          name: "confirmation",
          message: `Do you wish to override ${command.dataset}?`,
        })
        if (values.confirmation !== true) {
          process.exit(0)
        }
      }
      let ids: string[]
      if (command.include) {
        ids = command.include.replace(/ /g, "").split(",")
      } else {
        ids = []
        // See https://developers.google.com/youtube/v3/docs/channels/list
        const channelsResponse: any = await youtubeClient.get("channels", {
          searchParams: {
            id: process.env.YOUTUBE_CHANNEL_ID,
            part: "contentDetails",
          },
        })
        if (channelsResponse.body.items.length !== 1) {
          throw new Error("Could not find channel")
        }
        const playlistId =
          channelsResponse.body.items[0].contentDetails.relatedPlaylists.uploads
        let items: any[] = []
        let pageToken: null | string = null
        await pWhilst(
          () => pageToken !== undefined,
          async () => {
            // See https://developers.google.com/youtube/v3/docs/playlistItems/list
            const playlistItemsResponse: any = await youtubeClient.get(
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
        let videosResponse: any = await youtubeClient.get("videos", {
          searchParams: {
            id: slice.join(","),
            part: "id,snippet",
          },
        })
        youtubeVideos = youtubeVideos.concat(videosResponse.body.items)
      }
      let peertubeVideos: any[] = []
      if (process.env.PEERTUBE_ACCOUNT_NAME) {
        let start = 0
        let total: null | number = null
        await pWhilst(
          () => total === null || peertubeVideos.length < total,
          async () => {
            // See https://docs.joinpeertube.org/api-rest-reference.html#tag/Video/paths/~1videos/get
            const accountVideosResponse: any = await peertubeClient.get(
              `accounts/${process.env.PEERTUBE_ACCOUNT_NAME}/videos`,
              {
                searchParams: {
                  count: 50,
                  start: start,
                },
              }
            )
            peertubeVideos = peertubeVideos.concat(
              accountVideosResponse.body.data
            )
            total = accountVideosResponse.body.total
            start = peertubeVideos.length
          }
        )
      }
      const getPeerTubeUuid = function (title: string) {
        let uuid: string
        for (let index = 0; index < peertubeVideos.length; index++) {
          const peertubeVideo = peertubeVideos[index]
          if (leven(title, peertubeVideo.name) < 2) {
            uuid = peertubeVideo.uuid
            break
          }
        }
        return uuid
      }
      let json: any = {
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
      }
      youtubeVideos.forEach(function (youtubeVideo) {
        let peertubeUuid = getPeerTubeUuid(youtubeVideo.snippet.title)
        if (peertubeVideos.length > 0 && !peertubeUuid) {
          console.log(
            `Could not find PeerTube video matching "${youtubeVideo.snippet.title}"`
          )
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
        }
      })
      await writeFileAsync(command.dataset, JSON.stringify(json, null, 2))
      console.log(
        `Imported ${Object.keys(json.videos).length} videos to ${
          command.dataset
        }`
      )
    } catch (error) {
      console.log(error)
    }
  })

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
  sections: Section[]
  suggestedVideos: Snippet[]
  links: Snippet[]
  credits: Snippet[]
  affiliateLinks: AffiliateSnippet[]
  footnotes: Footnote[]
}

interface Dataset {
  headings: {
    sections: string
    suggestedVideos: string
    links: string
    credits: string
    affiliateLinks: string
    footnotes: string
  }
  separator: string
  affiliateLinks: {
    [key: string]: {
      [key: string]: AffiliateSnippet
    }
  }
  videos: {
    [key: string]: Video
  }
}

const heading = function (value: string) {
  return `\n\n==============================\n${value.toUpperCase()}\n==============================`
}

const description = function (
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
        const suggestedVideoAttributes = dataset.videos[suggestedVideoId]
        if (!suggestedVideoAttributes) {
          throw new Error("Not found")
        }
        if (platform === "youtube") {
          content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${process.env.YOUTUBE_CHANNEL_WATCH_URL}${suggestedVideoAttributes.id}`
        } else if (platform === "peertube") {
          content += `\n${suggestedVideoAttributes.title} ${dataset.separator} ${process.env.PEERTUBE_CHANNEL_WATCH_URL}${suggestedVideoAttributes.peerTubeUuid}`
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
          throw Error("Not found")
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
      let emoji = ""
      if (footnote.type === "warning") {
        emoji = "⚠️ "
      }
      if (footnote.timestamp === "") {
        content += `\n${emoji}${footnote.message}`
      } else {
        content += `\n${emoji}${footnote.timestamp} ${footnote.message}`
      }
    })
  }
  return content
}

const preview = function (
  dataset: Dataset,
  platform: string,
  video: Video,
  metadata: boolean
) {
  let content = `${chalk.bold(video.title)}`
  content += `\n\n${description(dataset, platform, video)}`
  if (metadata) {
    content += `\n\n${chalk.bold("Tags:")} ${video.tags.join(", ")}`
  }
  console.log(content)
}

program
  .command("preview <platform> <id>")
  .description("preview video description")
  .option(
    "--dataset <dataset>",
    "/path/to/tube-manager.json",
    path.resolve(process.cwd(), "tube-manager.json")
  )
  .option("--metadata", "enabled metadata preview")
  .action(async (platform, id, command) => {
    try {
      if (!["youtube", "peertube"].includes(platform)) {
        throw new Error("Invalid platform")
      }
      const json = await readFileAsync(command.dataset, "utf8")
      const dataset = JSON.parse(json)
      let video
      if (platform === "youtube") {
        video = dataset.videos[id]
      } else if (platform === "peertube") {
        const videoIds = Object.keys(dataset.videos)
        for (let index = 0; index < videoIds.length; index++) {
          const _video = dataset.videos[videoIds[index]]
          if (_video.peerTubeUuid === id) {
            video = _video
            break
          }
        }
      }
      if (!video) {
        throw new Error("Not found")
      }
      preview(
        dataset,
        platform,
        video,
        command.metadata ? command.metadata : false
      )
    } catch (error) {
      console.log(error)
    }
  })

program.parse(process.argv)
