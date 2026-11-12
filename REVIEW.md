# What a verified plugin is read against

A plugin is read in full, every version, by someone on Zuna's team, who merges it only when all
of this holds. A plugin someone installs can read what they can read, and one that may also reach
the internet can send it anywhere, so these rules are what "verified" promises.

## Source

- **All of it is here,** under `plugins/<id>/`, and CI builds the package from it with a lockfile.
  Nothing built arrives in a pull request: no `dist/`, no minified files, no bundled copies of
  other projects that aren't in a lockfile.
- **Under a license the OSI approves,** named in `plugin.json` and as a `LICENSE` in its folder.
- **No script is fetched and run at runtime.** No `eval` of anything that didn't come with the
  package, no `new Function` of fetched text, no code hidden in assets.
- **Readable.** Obfuscated code, or code that hides what it does, is refused, whatever it does.

## Permissions

- **No wider than what it does.** Each permission in `plugin.json` is used, and for what its
  description says. `messages.read` is asked for only by a plugin whose point is to read messages.
- **`messages.read` or `files.read` with `network` gets the closest reading.** What leaves the
  device is exactly what the plugin's description says leaves it, to exactly the hosts it names,
  and only when the person did something that asks for it.
- **Every third party it contacts is named** in its description, with what it sends there. A host
  in `hosts` that the code doesn't need is refused.
- **Filters say what they do.** A plugin that changes or stops what's sent says so in its
  description, and registers a filter as `required` only when going out without it would be worse
  than not going out at all.

## What it draws

- **Nothing that passes for the app.** No views that imitate Zuna's own questions, its sign-in,
  its verification, its dialogs about devices or plugins, or any other plugin.
- **Nothing asks for a password, a recovery key or a code,** for Zuna or anything else.
- **Toasts, notifications and dialogs only when the person would expect them.**

## Its behavior

- **Nothing outside what it describes:** no analytics, no tracking, no advertising, no mining, no
  reporting home.
- **Its own data is its own.** It keeps in storage only what it needs, and says what in its
  description when that's anything of the person's messages.
- **Its updates are read as its first version was:** a pull request that raises its version, read
  in full, diffed against the version before.

## When a published plugin turns out harmful

It's added to `revoked.json`, by id and version, or for a package by its hash, with a reason the
app shows, and published at once. Every device that has it turns it off the next time it reads the
index.
