# Build binaries

`eas` is configured in `eas.json` and a has a few profiles

## Build to test from iOS while you develop

```bash
eas build --profile development --platform ios
```

The `development` profile has:

1. `distribution: internal`: lets you drag and drop the ipa file to your phone. Make sure that UDID of the phones are selected while doing the build
2. `developmentClient: true`: adds the JS reloading so that it updates while you develop

After you've built an ipa with `--dev-client`, you can run:

```bash
npx expo start --dev-client
```

## Deploy to web

```bash
app $ bash bin/build_web_prod.sh
```

and then drag and drop the `dist/` folder into a new deployment of Cloudflare pages.

We can't directly use `wrangler` to deploy because it fails to include `node_modules` assets
like fonts from vector icons. It filters them out during upload.

## Build to test with a few users without going through the app store

```bash
eas build --profile preview --platform ios
```

This has `distribution: internal` as above but doesn't have `developmentClient: true`.

You can send the resulting expo link to any devices with the UDIDs added to the build.

For example: https://expo.dev/accounts/sbensu/projects/gatz/builds/9d78c3b4-87d2-4dda-843c-2117c6a4ee50

## Build for TestFlight

Don't forget to upgrade `app.config.js` in two places:

```diff
  "expo": {
-    "version": "1.0.32",
+    "version": "1.0.32",

    "android": {
-      "versionCode": 25,
+      "versionCode": 26,
```

And then run:

```bash
eas build --profile production --platform ios
```

Upload the binary to Apple:

```bash
eas submit -p ios
```

and if you run the previous step locally

```bash
eas submit -p ios --path=buid-121231231.ipa

```

## Updating without re-install

`eas-update`, documented [here](https://docs.expo.dev/eas-update/getting-started/) is set up for `preview` and `production`

```bash
eas update --branch preview --message "deploying to my phone"
```

```bash
eas update --branch production --message "deploying to everybody"
```

## Testing

Tests are written with `jest`. This should work:

```sh
yarn test
yarn test src/gifted/Bubble.test.tsx
```

### QA

We have a list of things to test in [QA here](https://docs.google.com/spreadsheets/d/19RovBzaqrwnQVQO0zBYF7IKcdvwETzIOKsQ9qwbXHoc/edit?gid=1323349408#gid=1323349408).

### Stryker: mutation testing

`stryker` is does mutation testing with:

```sh
npx stryker run striker.config.js > reports/mutation/stryker.txt ; cat reports/mutation/stryker.txt
```

If you run one file at at a time and it has only regions enabled (ex `src/gifted/Bubble.tsx`), it should take around a minute to run the tests.

# Notes

eas build

```
Using Api Key ID: VNTG9NHSQW ([Expo] EAS Submit rYhN3WC9RX)

ASC App ID:                 6476069960
Project ID:                 1238fa2f-3d16-45c7-900d-21c0be1dde3c
App Store Connect API Key:
    Key Name  :  [Expo] EAS Submit rYhN3WC9RX
    Key ID    :  VNTG9NHSQW
    Key Source:  EAS servers
Build:
    Build ID    :  e1cb7a48-b005-40e5-ae5b-52e2b6cb2221
    Build Date  :  1/14/2024, 5:56:53 PM
    App Version :  1.0.0
    Build number:  1
```

```
Project Credentials Configuration

Project                   @sbensu/latest
Bundle Identifier         chat.gatz

App Store Configuration

Distribution Certificate
Serial Number             5E64500EE3A06574E1E4B56295A95036
Expiration Date           Mon, 13 Jan 2025 09:02:56 GMT-0300
Apple Team                HH8959FDL3 (Adventureland Institute, Inc. (Company/Organization))
Updated                   1 minute ago

Provisioning Profile
Developer Portal ID       U8V9CX59AW
Status                    active
Expiration                Mon, 13 Jan 2025 09:02:56 GMT-0300
Apple Team                HH8959FDL3 (Adventureland Institute, Inc. (Company/Organization))
Updated                   1 second ago


Project Credentials Configuration

Project                   @sbensu/latest
Bundle Identifier         chat.gatz

App Store Configuration

Distribution Certificate
Serial Number             5E64500EE3A06574E1E4B56295A95036
Expiration Date           Mon, 13 Jan 2025 09:02:56 GMT-0300
Apple Team                HH8959FDL3 (Adventureland Institute, Inc. (Company/Organization))
Updated                   8 hours ago

Provisioning Profile
Developer Portal ID       U8V9CX59AW
Status                    active
Expiration                Mon, 13 Jan 2025 09:02:56 GMT-0300
Apple Team                HH8959FDL3 (Adventureland Institute, Inc. (Company/Organization))
Updated                   8 hours ago
```

# Submodules

To add a submodule:

```bash
cd vendor
git submodule add {DEPENDENCY_GITHUB} vendor/{DEPENDENCY}
```

```diff
// tsconfig.json
"include": [
+   "vendor/{DEPENDENCY}",
]
```

```diff
// metro.config.json
"extraNodeModules": [
+   "{DEPENDENCY}": PATH.resolve(__dirname, 'vendor/{DEPENDENCY}'),
]
```

Install the submodule's dependencies in `package.json` with `yarn install`.


## FrontendDB

What do I want? I want the component to say "i want this data to render"

And then I want somebody else to provide that data rather quickly.
