# tube-manager

## Manage YouTube (and syndicated PeerTube) videos using command line.

This project was developed to streamline the process of managing YouTube (and syndicated PeerTube) titles, descriptions and tags.

## I can do this by hand, why would I use tube-manager?

Because managing this by hand as a channel grows becomes exponentially overwhelming, especially when videos are associated to others and affiliate links are used over and over (what if a link changes?).

Not mentioning associated video links need to be platform-specific and having all this in one place is amazing (and git friendly).

For example, here's how the following data is transpiled for YouTube and PeerTube.

Notice how suggested video and affiliate links are automatically expanded?

Notice how suggested video links are platform-specific?

```
{
  "id": "1cz_ViFB6eE",
  "peerTubeUuid": "4b868b2f-5cd3-4a55-9b31-35de881a2b29",
  "publishedAt": "2020-08-28T13:07:18Z",
  "title": "How to backup and encrypt data using rsync and VeraCrypt on macOS (see change log)",
  "description": "This is the 36th episode of the privacy guides series.\n\nIn this episode, we explore how to backup and encrypt data using rsync and VeraCrypt on macOS.",
  "tags": ["Privacy", "Security", "Backups", "VeraCrypt", "rsync", "macOS"],
  "categoryId": "27",
  "sections": [
    {
      "label": "Intro",
      "timestamp": "0:00"
    },
    {
      "label": "Guide",
      "timestamp": "4:44"
    }
  ],
  "suggestedVideos": ["video.qPAOMczcuZw"],
  "links": [
    {
      "label": "Reference material",
      "url": "https://sunknudsen.com/privacy-guides/how-to-backup-and-encrypt-data-using-rsync-and-veracrypt-on-macos"
    },
    {
      "label": "VeraCrypt",
      "url": "https://www.veracrypt.fr/en/Home.html"
    }
  ],
  "credits": [],
  "affiliateLinks": ["amazon.samsungBar", "amazon.sandiskExtremePro"],
  "footnotes": [
    {
      "type": "",
      "timestamp": "",
      "message": "The reference material has been updated so what you see in this episode might differ."
    }
  ]
}
```

**YouTube**

```
This is the 36th episode of the privacy guides series.

In this episode, we explore how to backup and encrypt data using rsync and VeraCrypt on macOS.

==============================
TL;DR
==============================
0:00 Intro
4:44 Guide

==============================
SUGGESTED
==============================
More on rsync and VeraCrypt backups on macOS and introducing the privacy guides docs 👉 https://www.youtube.com/watch?v=qPAOMczcuZw

==============================
LINKS
==============================
Reference material 👉 https://sunknudsen.com/privacy-guides/how-to-backup-and-encrypt-data-using-rsync-and-veracrypt-on-macos
VeraCrypt 👉 https://www.veracrypt.fr/en/Home.html

==============================
AFFILIATE LINKS
==============================
Samsung BAR Plus 32GB
USA 👉 https://www.amazon.com/dp/B07BPHML28?tag=sunknudsen06-20
UK 👉 https://www.amazon.co.uk/dp/B07D1JMX87?tag=sunknudsen-21
Canada 👉 https://www.amazon.ca/dp/B07BPHML28?tag=sunknudsen02-20

SanDisk Extreme Pro 32GB SDHC UHS-I Card
USA 👉 https://www.amazon.com/dp/B01J5RHBQ4?tag=sunknudsen06-20
UK 👉 https://www.amazon.co.uk/dp/B01J5RHBQ4?tag=sunknudsen-21
Canada 👉 https://www.amazon.ca/dp/B01J5RHBQ4?tag=sunknudsen02-20

==============================
CHANGE LOG
==============================
The reference material has been updated so what you see in this episode might differ.
```

**PeerTube**

```
In this episode, we explore how to backup and encrypt data using rsync and VeraCrypt on macOS.

==============================
TL;DR
==============================
0:00 Intro
4:44 Guide

==============================
SUGGESTED
==============================
More on rsync and VeraCrypt backups on macOS and introducing the privacy guides docs 👉 https://peertube.sunknudsen.com/videos/watch/614f53aa-3907-4e44-b200-a9111b164712

==============================
LINKS
==============================
Reference material 👉 https://sunknudsen.com/privacy-guides/how-to-backup-and-encrypt-data-using-rsync-and-veracrypt-on-macos
VeraCrypt 👉 https://www.veracrypt.fr/en/Home.html

==============================
AFFILIATE LINKS
==============================
Samsung BAR Plus 32GB
USA 👉 https://www.amazon.com/dp/B07BPHML28?tag=sunknudsen06-20
UK 👉 https://www.amazon.co.uk/dp/B07D1JMX87?tag=sunknudsen-21
Canada 👉 https://www.amazon.ca/dp/B07BPHML28?tag=sunknudsen02-20

SanDisk Extreme Pro 32GB SDHC UHS-I Card
USA 👉 https://www.amazon.com/dp/B01J5RHBQ4?tag=sunknudsen06-20
UK 👉 https://www.amazon.co.uk/dp/B01J5RHBQ4?tag=sunknudsen-21
Canada 👉 https://www.amazon.ca/dp/B01J5RHBQ4?tag=sunknudsen02-20

==============================
CHANGE LOG
==============================
The reference material has been updated so what you see in this episode might differ.
```

## Installation

**Step 1: go to https://console.developers.google.com**

**Step 2: create project, enable "YouTube Data API v3" and "YouTube Analytics API" APIs and create "OAuth client ID" credentials**

This is where we get the values of `youtube.clientId` and `youtube.clientSecret`.

**Step 3: go to https://peertube.sunknudsen.com/api/v1/oauth-clients/local**

> Heads up: replace `peertube.sunknudsen.com` by the hostname of your PeerTube instance.

This is where we get the values of `peertube.clientId` and `peertube.clientSecret`.

**Step 4: run following commands**

> Heads up: these commands have been tested on macOS only.

```shell
npm install tube-manager -g
mkdir -p ~/.tube-manager
cp $(npm root -g)/tube-manager/config.json.sample ~/.tube-manager/config.json
open -a "TextEdit" ~/.tube-manager/config.json
```

**Step 5: edit `config.json`**

> Heads up: for increased security, saving `youtube.refreshToken` and `peertube.refreshToken` is optional (when omitted, a prompt will ask for them at run time).

Once YouTube client ID and secret are saved to `config.json`, run `tube-manager refresh-token youtube` to get values of `youtube.accessToken` and `youtube.refreshToken`.

Once PeerTube client ID and secret are saved to `config.json`, run `tube-manager refresh-token peertube` to get values of `peertube.refreshToken` and `peertube.refreshToken` environment variables.

Once access and refresh tokens are saved to `config.json`, run `tube-manager channels youtube` to get value of `youtube.channelId` and `tube-manager channels peertube` to get value of `peertube.channelId`.

`peertube.accountName` is your PeerTube username.

**All set!**

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
2. Upload video to YouTube using [YouTube Studio](https://studio.youtube.com/)
3. Import video to dataset (see [example](./examples/sunknudsen.json)) using `tube-manager import <id>`
4. Update title, description, tags, **sections**, **suggestedVideos**, **links**, **credits**, **affiliateLinks** and **footnotes**
5. Publish video to YouTube and PeerTube using `tube-manager publish <id>`

## Contributors

[Sun Knudsen](https://sunknudsen.com/)

## Licence

MIT
