import got, { Got } from "got"
import open from "open"
import prompts from "prompts"
import queryString from "query-string"
import Config from "./config.js"

export default class YouTube {
  readonly config: Config
  public got: Got
  constructor(config: Config) {
    this.config = config
    this.got = got.extend({
      mutableDefaults: true,
      prefixUrl: this.config.props.youtube.apiPrefixUrl,
      headers: {
        authorization:
          this.config.props.youtube.accessToken !== ""
            ? `Bearer ${this.config.props.youtube.accessToken}`
            : undefined,
      },
      responseType: "json",
      hooks: {
        afterResponse: [
          async (response, retryWithMergedOptions) => {
            if ([401, 403].includes(response.statusCode)) {
              const accessToken = await this.getAccessToken()
              const updatedOptions = {
                headers: {
                  authorization: `Bearer ${accessToken}`,
                },
              }
              this.got.defaults.options.merge(updatedOptions)
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
  }
  async getRefreshToken(): Promise<{
    access_token: string
    refresh_token: string
  }> {
    try {
      // See https://developers.google.com/identity/protocols/oauth2/web-server
      // See https://developers.google.com/identity/protocols/oauth2/scopes#youtube
      open(
        `${this.config.props.youtube.oauth2PrefixUrl}/auth?client_id=${this.config.props.youtube.clientId}&redirect_uri=http://localhost:8080&response_type=code&scope=https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/yt-analytics-monetary.readonly&access_type=offline`
      )
      const { redirectUri } = await prompts({
        message: "Please paste redirect URI here and press enter",
        name: "redirectUri",
        type: "text",
        validate: (value) => {
          console.log(value)
          if (/http:\/\/localhost:8080\/\?code=/.test(value) === false) {
            return "Please enter a valid redirect URI"
          }
          return true
        },
      })
      const parsed = queryString.parseUrl(redirectUri)
      // See https://developers.google.com/identity/protocols/oauth2/web-server
      const response: any = await this.got.post(`token`, {
        prefixUrl: this.config.props.youtube.oauth2PrefixUrl,
        json: {
          client_id: this.config.props.youtube.clientId,
          client_secret: this.config.props.youtube.clientSecret,
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
  async getAccessToken(): Promise<string> {
    try {
      let refreshToken = this.config.props.youtube.refreshToken
      if (refreshToken === "") {
        const values = await prompts({
          type: "password",
          name: "refreshToken",
          message: "Please paste YouTube refresh token here and press enter",
        })
        refreshToken = values.refreshToken
      }
      // See https://developers.google.com/identity/protocols/oauth2/web-server
      const response: any = await this.got.post(`token`, {
        prefixUrl: this.config.props.youtube.oauth2PrefixUrl,
        json: {
          client_id: this.config.props.youtube.clientId,
          client_secret: this.config.props.youtube.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        },
        responseType: "json",
      })
      this.config
        .set({
          youtube: {
            accessToken: response.body.access_token,
          },
        })
        .save()
      return response.body.access_token
    } catch (error) {
      throw error
    }
  }
}
