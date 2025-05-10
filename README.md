# tube-manager

## Manage YouTube videos using command line.

This project was developed to streamline the process of managing YouTube titles, descriptions and tags.

## I can do this by hand, why would I use tube-manager?

Because managing this by hand as a channel grows becomes exponentially overwhelming, especially when videos are associated to others and affiliate links are used over and over (what if a link changes?).

Not mentioning associated video links need to be platform-specific and having all this in one place is amazing (and Git friendly).

For example, here’s how the following data from dataset (see [sample](./samples/tube-manager.json)) is transpiled for YouTube.

Notice how suggested video and affiliate links are automatically expanded?

**Data**

```json
{
  "id": "YrUSJQq8WOA",
  "publishedAt": "2022-11-03T14:43:45Z",
  "title": "macOS stores a copy of everything one prints forever",
  "description": "In this episode, we explore how macOS stores a copy of everything one prints forever.",
  "tags": ["Privacy", "Security", "macOS"],
  "categoryId": "27",
  "sections": [],
  "suggestedVideos": [],
  "links": [
    {
      "label": "How to disable CUPS pinter job history on macOS",
      "url": "https://sunknudsen.com/guides/how-to-disable-cups-printer-job-history-on-macos"
    },
    {
      "label": "Twitter (please follow @superbacked)",
      "url": "https://twitter.com/superbacked"
    },
    {
      "label": "Superbacked (join waiting list)",
      "url": "https://superbacked.com/"
    }
  ],
  "credits": [],
  "affiliateLinks": ["amazon.brotherPrinter"],
  "footnotes": [],
  "support": [
    {
      "label": "Support my work",
      "url": "https://sunknudsen.com/donate"
    }
  ],
  "thumbnailHash": "65c65f74ac181dcffc994d9f75ed88392bdcc434165bc59dda2a0553a0725ac6"
}
```

**YouTube**

```
macOS stores a copy of everything one prints forever

In this episode, we explore how macOS stores a copy of everything one prints forever.

==============================
LINKS
==============================
How to disable CUPS pinter job history on macOS 👉 https://sunknudsen.com/guides/how-to-disable-cups-printer-job-history-on-macos
Twitter (please follow @superbacked) 👉 https://twitter.com/superbacked
Superbacked (join waiting list) 👉 https://superbacked.com/

==============================
AFFILIATE LINKS
==============================
Brother HL-L2460DW printer
USA 👉 https://www.amazon.com/dp/B0CPL2N5H6?tag=sunknudsen06-20

==============================
SUPPORT
==============================
Support my work 👉 https://sunknudsen.com/donate
```

## Installation

### Step 1: go to https://console.developers.google.com

### Step 2: create project, enable “YouTube Data API v3” and “YouTube Analytics API” APIs and create “OAuth client ID” credentials (required scopes: `.../auth/yt-analytics.readonly` and `.../auth/youtube.force-ssl`)

This is where we get the values of `youtube.clientId` and `youtube.clientSecret`.

### Step 3: run following commands

#### macOS

```shell
npm install -g tube-manager
mkdir -p ~/.tube-manager
cp $(npm root -g)/tube-manager/samples/config.json ~/.tube-manager/config.json
open -a "TextEdit" ~/.tube-manager/config.json
```

#### Linux

> Heads up: if `nano` is not installed, please use `vi`.

```shell
sudo npm install tube-manager -g
mkdir -p ~/.tube-manager
cp $(npm root -g)/tube-manager/config.json.sample ~/.tube-manager/config.json
nano ~/.tube-manager/config.json
```

### Step 4: edit `config.json`

> Heads up: for increased security, saving `youtube.refreshToken` is optional (when omitted, a prompt will ask for refresh token at run time).

Once YouTube client ID and secret are saved to `config.json`, run `tube-manager refresh-token youtube` to get values of `youtube.accessToken` and `youtube.refreshToken`.

Once access and refresh token are saved to `config.json`, run `tube-manager channels youtube` to get value of `youtube.channelId`.

## Usage

```console
$ tube-manager -h
Usage: tube-manager [options] [command]

Options:
  -h, --help                          display help for command

Commands:
  refresh-token [options] <platform>  get refresh token
  channels [options] <platform>       get channels
  stats [options] <platform>          get stats
  video [options] <platform> <id>     get video
  initialize [options]                initialize dataset
  import [options] <id>               import video
  preview [options] <platform> <id>   preview video
  publish [options] [id]              publish video(s)
  help [command]                      display help for command
```

**TL;DR**

1. Initialize dataset using `tube-manager initialize`
2. Upload video to YouTube as usual using [YouTube Studio](https://studio.youtube.com/)
3. Import video to dataset using `tube-manager import <id>`
4. Edit title, description, tags, **sections**, **suggestedVideos**, **links**, **credits**, **affiliateLinks**, **footnotes** and **support** (see [tube-manager.schema.json](./schemas/tube-manager.schema.json))
5. Add thumbnail to thumbnail directory (see [sample](./samples/tube-manager) and `tube-manager publish --help`)
6. Publish video to YouTube using `tube-manager publish <id>`

## How to use [Visual Studio Code](https://code.visualstudio.com/) to edit config and dataset

Editing config and dataset using Visual Studio Code makes things much more efficient thanks to [IntelliSense](https://code.visualstudio.com/Docs/languages/json).

### Step 1: download and install Visual Studio Code

### Step 2: enable `code` command

Click “View”, then “Command Palette…”, type “install code”, select “Install 'code' command in PATH” and press enter.

### Step 3: download and install Prettier extension

### Step 4: add JSON schemas to user settings

Click “View”, then “Command Palette…”, type “settings json”, select and press enter.

```json
"json.schemas": [
  {
    "fileMatch": [
      ".tube-manager/config.json"
    ],
    "url": "https://raw.githubusercontent.com/sunknudsen/tube-manager/master/schemas/config.schema.json"
  },
  {
    "fileMatch": [
      "tube-manager.json"
    ],
    "url": "https://raw.githubusercontent.com/sunknudsen/tube-manager/master/schemas/tube-manager.schema.json"
  }
]
```

### Step 5: edit config or dataset using `code ~/.tube-manager/config.json` and `code /path/to/tube-manager.json`

## Contributors

[Sun Knudsen](https://sunknudsen.com/)

## Licence

MIT
