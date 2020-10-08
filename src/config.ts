"use strict"

import { promisify } from "util"
import { readFile, writeFile } from "fs"
import prettier from "prettier"

const readFileAsync = promisify(readFile)
const writeFileAsync = promisify(writeFile)

interface Props {
  youtube: {
    oauth2PrefixUrl: string
    apiPrefixUrl: string
    clientId: string
    clientSecret: string
    accessToken: string
    refreshToken: string
    channelId: string
    channelWatchUrl: string
  }
  peertube: {
    apiPrefixUrl: string
    clientId: string
    clientSecret: string
    accessToken: string
    refreshToken: string
    accountName: string
    channelId: string
    channelWatchUrl: string
  }
}

interface Profiles {
  [profile: string]: Props
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export default class Config {
  readonly path: string
  readonly profile: string
  private profiles: Profiles
  public props: Props
  constructor(path: string, profile: string) {
    this.path = path
    this.profile = profile
  }
  async load() {
    const json = await readFileAsync(this.path, "utf8")
    this.profiles = JSON.parse(json)
    this.props = this.profiles[this.profile]
  }
  set(props: DeepPartial<Props>) {
    // This doesn't support nested platform properties
    Object.keys(this.props).forEach((platform: keyof Props) => {
      const platformProps = this.props[platform]
      if (props[platform]) {
        Object.assign(platformProps, props[platform])
      }
    })
    console.log(this.profiles)
    return this
  }
  async save() {
    await writeFileAsync(
      this.path,
      prettier.format(JSON.stringify(this.profiles, null, 2), {
        parser: "json",
      })
    )
  }
}
