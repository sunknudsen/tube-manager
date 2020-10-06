"use strict"

import dotenv from "dotenv"
import open from "open"
import inquirer from "inquirer"
import queryString from "query-string"
import got from "got"
import { updateDotEnv } from "./env"

dotenv.config()

export const getRefreshToken = async function () {
  try {
    // See https://developers.google.com/identity/protocols/oauth2/web-server
    // See https://developers.google.com/identity/protocols/oauth2/scopes#youtube
    open(
      `${process.env.YOUTUBE_OAUTH2_PREFIX_URL}/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=http://localhost:8080&response_type=code&scope=https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/yt-analytics-monetary.readonly&access_type=offline`
    )
    const values = await inquirer.prompt({
      name: "redirectUri",
      message: "Please paste redirect URI here and press enter",
      validate: function (value) {
        if (value.match(/http:\/\/localhost:8080\/\?code=/)) {
          return true
        }
        return "Please enter a valid redirect URI"
      },
    })
    const parsed = queryString.parseUrl(values.redirectUri)
    // See https://developers.google.com/identity/protocols/oauth2/web-server
    const response: any = await got.post(`token`, {
      prefixUrl: process.env.YOUTUBE_OAUTH2_PREFIX_URL,
      json: {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        code: parsed.query.code as string,
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:8080",
      },
      responseType: "json",
    })
    return {
      access_token: response.body.access_token,
      refresh_token: response.body.refresh_token,
    }
  } catch (error) {
    throw error
  }
}

const getAccessToken = async function () {
  try {
    let refreshToken = process.env.YOUTUBE_REFRESH_TOKEN
    if (refreshToken === "") {
      const values = await inquirer.prompt({
        type: "password",
        name: "refreshToken",
        message: "Please paste YouTube refresh token here and press enter",
      })
      refreshToken = values.refreshToken
    }
    // See https://developers.google.com/identity/protocols/oauth2/web-server
    const response: any = await got.post(`token`, {
      prefixUrl: process.env.YOUTUBE_OAUTH2_PREFIX_URL,
      json: {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      },
      responseType: "json",
    })
    updateDotEnv({
      YOUTUBE_ACCESS_TOKEN: response.body.access_token,
    })
    return response.body.access_token
  } catch (error) {
    throw error
  }
}

const youtubeClient = got.extend({
  mutableDefaults: true,
  prefixUrl: process.env.YOUTUBE_API_PREFIX_URL,
  headers: {
    authorization:
      process.env.YOUTUBE_ACCESS_TOKEN !== ""
        ? `Bearer ${process.env.YOUTUBE_ACCESS_TOKEN}`
        : undefined,
  },
  responseType: "json",
  hooks: {
    afterResponse: [
      async (response, retryWithMergedOptions) => {
        if ([401, 403].includes(response.statusCode)) {
          const accessToken = await getAccessToken()
          const updatedOptions = {
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          }
          youtubeClient.defaults.options = got.mergeOptions(
            youtubeClient.defaults.options,
            updatedOptions
          )
          return retryWithMergedOptions(updatedOptions)
        }
        return response
      },
    ],
  },
  retry: {
    limit: 2,
  },
})

export default youtubeClient
