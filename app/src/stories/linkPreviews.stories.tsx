
import React from 'react';
import { LinkPreview } from '../vendor/react-native-link-preview/LinkPreview';
import { LinkPreviewData } from '../gatz/types';

const PREVIEW_DATA: Record<string, LinkPreviewData> = {
    "google.com": {
        "id": '1',
        "host": "google.com",
        "images": [],
        "media_type": "website",
        "title": "Google",
        "favicons": [
            "https://google.com/favicon.ico"
        ],
        "description": "",
        "site_name": "",
        "videos": [],
        "uri": "https://google.com",
        "url": "https://google.com",
        "created_at": "2025-01-21T00:22:11.841Z",
        "version": 1,
        "type": "preview"
    },
    "stripe.com": {
        "host": "stripe.com",
        "images": [
            {
                "uri": "https://images.stripeassets.com/fzn2n1nzq965/3AGidihOJl4nH9D1vDjM84/9540155d584be52fc54c443b6efa4ae6/homepage.png?q=80",
                "width": null,
                "height": null
            }
        ],
        "media_type": "website",
        "type": "preview",
        "title": "Stripe | Financial Infrastructure to Grow Your Revenue",
        "favicons": [
            "https://assets.stripeassets.com/fzn2n1nzq965/01hMKr6nEEGVfOuhsaMIXQ/c424849423b5f036a8892afa09ac38c7/favicon.ico",
            "https://images.stripeassets.com/fzn2n1nzq965/2EOOpI2mMZgHYBlbO44zWV/5a6c5d37402652c80567ec942c733a43/favicon.png?w=180&h=180"
        ],
        "description": "Stripe powers online and in-person payment processing and financial solutions for businesses of all sizes. Accept payments, send payouts, and automate financial processes with a suite of APIs and no-code tools.",
        "site_name": "",
        "videos": [],
        "id": "01948488-a188-281a-02b0-f01f2222620e",
        "url": "https:\/\/stripe.com",
        "created_at": "2025-01-20T16:25:34.344Z",
        "version": 1,
        "uri": "https://stripe.com"
    },
    "github.com": {
        "host": "github.com",
        "images": [
            {
                "uri": "https://opengraph.githubassets.com/9dae9732a648a1a7a109ea7f7724a5cdff1b6201e79f1e343d228f812f84df4a/deepseek-ai/DeepSeek-R1",
                "width": null,
                "height": null
            }
        ],
        "media_type": "object",
        "type": "preview",
        "title": "GitHub - deepseek-ai\/DeepSeek-R1",
        "favicons": [
            "https://github.githubassets.com/favicons/favicon.svg"
        ],
        "description": "Contribute to deepseek-ai\/DeepSeek-R1 development by creating an account on GitHub.",
        "site_name": "GitHub",
        "videos": [],
        "id": "0194863c-fe81-cc29-1098-8e3bde656932",
        "url": "https:\/\/github.com\/deepseek-ai\/deepseek-r1",
        "created_at": "2025-01-21T00:22:11.841Z",
        "version": 1,
        "uri": "https://github.com/deepseek-ai/deepseek-r1"
    },
    "youtube.com": {
        id: "1",
        type: "preview",
        version: 1,
        created_at: "2025-01-21T00:22:11.841Z",
        uri: "https://www.youtube.com/watch?v=l5WgAr4B8Vo",
        url: "https://www.youtube.com/watch?v=l5WgAr4B8Vo",
        title: "Stromae - Multitude, le film (Full concert)",
        description: "The official video of Stromae's Multitude live showDirected by Cyprien Delire and Luc Van Haver© Mosaert Label 2024Listen to the concert setlist here: https:...",
        site_name: "YouTube",
        host: "youtube.com",
        media_type: "video",
        images: [{
            uri: "https://i.ytimg.com/vi/l5WgAr4B8Vo/maxresdefault.jpg",
            width: 1280,
            height: 720
        }],
        videos: [],
        favicons: ["https://www.gstatic.com/images/branding/product/1x/youtube_24dp.png"]
    },
    "yahoo.com": {
        "host": "yahoo.com",
        "images": [
            {
                "uri": "https://s.yimg.com/cv/apiv2/social/images/yahoo_default_logo.png",
                "width": null,
                "height": null
            }
        ],
        "media_type": "website",
        "type": "preview",
        "title": "Yahoo | Mail, Weather, Search, Politics, News, Finance, Sports & Videos",
        "favicons": [
            "https://s.yimg.com/cv/apiv2/social/images/yahoo_default_logo.png",
            "https://s.yimg.com/rz/l/favicon.ico"
        ],
        "description": "Latest news coverage, email, free stock quotes, live scores and video are just the beginning. Discover more every day at Yahoo!",
        "site_name": "",
        "videos": [],
        "id": "01948111-b522-a80b-a6d3-ec52b87b583b",
        "url": "https:\/\/yahoo.com",
        "created_at": "2025-01-20T00:16:48.928Z",
        "version": 1,
        "uri": "https://yahoo.com"
    },
    "vxtwitter.com": {
        "host": "vxtwitter.com",
        "images": [],
        "media_type": "website",
        "type": "preview",
        "title": "",
        "favicons": [
            "https://vxtwitter.com/favicon.ico"
        ],
        "description": "",
        "site_name": "",
        "videos": [],
        "id": "0194896a-d3af-8917-1053-fde22648732a",
        "url": "https:\/\/vxtwitter.com\/theovonscousin\/status\/1881714572849246258",
        "created_at": "2025-01-21T15:11:07.183Z",
        "version": 1,
        "uri": "https://vxtwitter.com/theovonscousin/status/1881714572849246258",
    },
    "bigtwitter.com": {
        "host": "x.com",
        "images": [],
        "media_type": "tweet",
        "type": "preview",
        "title": null,
        "favicons": [],
        "description": null,
        "site_name": "Twitter",
        "videos": [],
        "id": "019489c2-4608-f667-7ecc-6db8426c77ce",
        "url": "https:\/\/x.com\/thebabylonbee\/status\/1861454974426722737",
        "created_at": "2025-01-21T16:46:38.088Z",
        "version": 1,
        "html": "<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">Trump Proposes 25 Percent Tariff On Imports From California <a href=\"https:\/\/t.co\/dfF52auITC\">https:\/\/t.co\/dfF52auITC<\/a> <a href=\"https:\/\/t.co\/rLytnSDy3i\">pic.twitter.com\/rLytnSDy3i<\/a><\/p>&mdash; The Babylon Bee (@TheBabylonBee) <a href=\"https:\/\/twitter.com\/TheBabylonBee\/status\/1861454974426722737?ref_src=twsrc%5Etfw\">November 26, 2024<\/a><\/blockquote>\n<script async src=\"https:\/\/platform.twitter.com\/widgets.js\" charset=\"utf-8\"><\/script>\n\n",
        "uri": "https://x.com/thebabylonbee/status/1861454974426722737",
    },
    "smalltweet.com": {
        "host": "x.com",
        "images": [],
        "media_type": "tweet",
        "type": "preview",
        "title": null,
        "favicons": [],
        "description": null,
        "site_name": "Twitter",
        "videos": [],
        "id": "01948a5e-1b79-144f-c74f-d62002a36373",
        "url": "https:\/\/x.com\/bobeunlimited\/status\/1879500009537957982",
        "created_at": "2025-01-21T19:36:50.809Z",
        "version": 1,
        "html": "<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">US inflation is stuck above the Fed&#39;s mandate, despite all the rhetoric and hope otherwise.<br><br>And a look across a broad set of inflation data suggests not much progress is being made in recent months and if anything signs of some upward pressures.<br><br>Thread.<\/p>&mdash; Bob Elliott (@BobEUnlimited) <a href=\"https:\/\/twitter.com\/BobEUnlimited\/status\/1879500009537957982?ref_src=twsrc%5Etfw\">January 15, 2025<\/a><\/blockquote>\n<script async src=\"https:\/\/platform.twitter.com\/widgets.js\" charset=\"utf-8\"><\/script>\n\n",
        "uri": "https://x.com/bobeunlimited/status/1879500009537957982"
    }
};

export default {
    component: LinkPreview,
    title: 'Task',
    tags: ['autodocs'],
    args: {
        bigTweet: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["bigtwitter.com"]
        },
        smallTweet: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["smalltweet.com"]
        },
        small: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["google.com"]
        },
        large: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["stripe.com"]
        },
        medium: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["github.com"]
        },
        full: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["youtube.com"]
        },
        smallImage: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["yahoo.com"]
        },
        empty: {
            withShadow: true,
            withBorder: true,
            previewData: PREVIEW_DATA["vxtwitter.com"]
        },
    }
};

