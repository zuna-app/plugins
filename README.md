# Zuna's plugins

The marketplace of [Zuna](https://github.com/zuna-app/zuna)'s native app: the source of every
verified plugin, the rules a plugin is read against, and the job that builds, signs and publishes
them.

A plugin here was read by Zuna's team, built on CI from the source in this repository, and signed
with keys the app carries. That's what "verified" means in the app. Nothing arrives here as a
built file, and nothing is listed that nobody read.

## How the app uses this

Publishing makes a release of this repository called `plugins`, holding `index.json`, its
signature `index.json.sig`, and every package, `<id>-<version>.zunaplugin`. The app reads the index
when the person opens Settings → Plugins → Browse, and, when a verified plugin is installed, now
and then beside its own check for updates. A device with no plugins never asks.

The app checks, in order: the index's signature, before reading anything in it; that its serial
isn't lower than the highest it has seen; then for a package, its size and SHA-256, its own
signature, and that its manifest says what the index said of it. `revoked.json` withdraws a plugin,
a version of one, or any package by its hash, from every device that has it, the next time the
index is read.

## Offering a plugin

1. Write it with the SDK in [`packages/plugin-sdk`](https://github.com/zuna-app/zuna/tree/main/packages/plugin-sdk)
   of Zuna's repository, as [`docs/PLUGINS.md`](https://github.com/zuna-app/zuna/blob/main/docs/PLUGINS.md)
   there says.
2. Open a pull request here adding `plugins/<id>/`: its `plugin.json`, its source under `src/`,
   its `assets/`, and a `LICENSE`.
3. CI builds and checks it. Someone on Zuna's team reads it against [REVIEW.md](REVIEW.md).
4. Once it's merged, the publishing job builds it again from that source, signs it and lists it.

A new version is a pull request that raises its `version`. A version once published is never
built again: it needs a new number.

## Building here

```bash
node scripts/plugins.mjs check
```

checks out the SDK from Zuna's repository into `.zuna/`, then builds and checks every plugin.
`node scripts/plugins.mjs publish` is the publishing job's, and needs the signing key.

## Licenses

Each plugin is under the license its folder names, which is one the OSI approves. The scripts
and workflows of this repository are under the MIT license. A plugin that uses only the plugin
API isn't bound by the app's AGPL; how to word that so that it holds is still to be settled with
a lawyer before an outside author's plugin is verified.
