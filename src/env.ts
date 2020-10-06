"use strict"

import dotenv from "dotenv"
import { resolve } from "path"
import { promisify } from "util"
import { writeFile } from "fs"

const result = dotenv.config()

const dotenvPath = resolve(process.cwd(), ".env")

const writeFileAsync = promisify(writeFile)

export interface EnvironmentVariables {
  [key: string]: string
}

export const updateDotEnv = async function (variables: EnvironmentVariables) {
  const merged = Object.assign(result.parsed, variables)
  let data = ""
  Object.keys(merged).forEach(function (key: string) {
    data += `${key}=${merged[key]}\n`
  })
  await writeFileAsync(dotenvPath, data)
}
