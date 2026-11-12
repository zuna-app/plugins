// Builds, checks and publishes this repository's plugins with the SDK in Zuna's repository.
//
//   node scripts/plugins.mjs check [id ...]   builds and checks every plugin, or those named
//   node scripts/plugins.mjs publish          the publishing job's: builds each version not yet
//                                             published, signs it and the index with
//                                             PLUGIN_SIGNING_KEY, and uploads them to the
//                                             `plugins` release
//
// The SDK comes from Zuna's repository, checked out into .zuna/ at ZUNA_REF (main unless set),
// so a plugin is built against the API of the app that runs it. A version once published is
// never built again: its package, as signed then, stays the one the index names.

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const zuna = join(root, ".zuna");
const cli = join(zuna, "packages", "plugin-sdk", "cli", "zuna-plugin.mjs");
const RELEASE = "plugins";

/** @param {string} command @param {string[]} args @param {object} [options] */
function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", ...options });
}

function fail(message) {
  console.error(`plugins: ${message}`);
  process.exit(1);
}

/** The SDK, from Zuna's repository. */
function ensureSdk() {
  const ref = process.env.ZUNA_REF ?? "main";
  if (!existsSync(join(zuna, ".git"))) {
    run("git", ["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", ref, "https://github.com/zuna-app/zuna.git", zuna], { stdio: "inherit" });
    run("git", ["-C", zuna, "sparse-checkout", "set", "packages/plugin-sdk"], { stdio: "inherit" });
  } else if (!process.env.ZUNA_KEEP) {
    run("git", ["-C", zuna, "fetch", "--depth", "1", "origin", ref], { stdio: "inherit" });
    run("git", ["-C", zuna, "checkout", "--quiet", "FETCH_HEAD"], { stdio: "inherit" });
  }
  if (!existsSync(cli)) fail("the SDK isn't in Zuna's repository at that ref.");
  if (!existsSync(join(root, "node_modules", "esbuild"))) fail("esbuild isn't installed: run npm ci first.");
}

/** Every plugin's folder, or those named. @param {string[]} only */
function plugins(only) {
  const dir = join(root, "plugins");
  const all = existsSync(dir) ? readdirSync(dir).filter((name) => existsSync(join(dir, name, "plugin.json"))).sort() : [];
  for (const name of only) if (!all.includes(name)) fail(`there's no plugins/${name}.`);
  return (only.length ? only : all).map((name) => ({ name, dir: join(dir, name), manifest: JSON.parse(readFileSync(join(dir, name, "plugin.json"), "utf8")) }));
}

/** What a plugin's folder must hold besides what the SDK checks. */
function checkFolder({ name, dir, manifest }) {
  const problems = [];
  if (manifest.id !== name) problems.push(`its folder is ${name}, and its id ${manifest.id}.`);
  if (!existsSync(join(dir, "LICENSE"))) problems.push("it has no LICENSE.");
  const tracked = run("git", ["ls-files", "--", `plugins/${name}`]).split("\n").filter(Boolean);
  if (tracked.some((file) => /\/(dist|node_modules)\//.test(file))) problems.push("it has built files in the repository: nothing built arrives here.");
  if (tracked.some((file) => /\.min\.js$/.test(file))) problems.push("it has minified files in the repository.");
  return problems;
}

function check(only) {
  ensureSdk();
  let failed = false;
  for (const plugin of plugins(only)) {
    const problems = checkFolder(plugin);
    try {
      process.stdout.write(run(process.execPath, [cli, "check", plugin.dir]));
    } catch {
      problems.push("the SDK refused it, as above.");
    }
    if (problems.length) {
      failed = true;
      console.error(`! ${plugin.name}:\n  ${problems.join("\n  ")}`);
    }
  }
  if (failed) process.exit(1);
  console.log("> every plugin builds and would load");
}

/** The index the release has now, and its signature, or nothing before the first publish. @param {string} into */
function previous(into) {
  try {
    run("gh", ["release", "download", RELEASE, "--pattern", "index.json", "--pattern", "index.json.sig", "--dir", into, "--clobber"], { stdio: "inherit" });
    return JSON.parse(readFileSync(join(into, "index.json"), "utf8"));
  } catch {
    return null;
  }
}

function publish() {
  const key = process.env.PLUGIN_SIGNING_KEY;
  if (!key) fail("PLUGIN_SIGNING_KEY isn't set, so nothing can be signed.");
  ensureSdk();
  check([]);
  const work = mkdtempSync(join(tmpdir(), "zuna-plugins-"));
  const keyFile = join(work, "plugins.key");
  writeFileSync(keyFile, key.includes("\n") ? key : `${key}\n`);
  chmodSync(keyFile, 0o600);
  try {
    const prev = join(work, "previous");
    const out = join(work, "out");
    mkdirSync(prev, { recursive: true });
    mkdirSync(out, { recursive: true });
    const index = previous(prev);
    const published = new Set((index?.plugins ?? []).flatMap((plugin) => plugin.versions.map((version) => `${plugin.id}@${version.version}`)));
    const fresh = plugins([]).filter(({ manifest }) => !published.has(`${manifest.id}@${manifest.version}`));
    for (const plugin of fresh) process.stdout.write(run(process.execPath, [cli, "pack", plugin.dir, "--out", out, "--key", keyFile]));
    const revoked = JSON.parse(readFileSync(join(root, "revoked.json"), "utf8"));
    if (fresh.length === 0 && index && JSON.stringify(index.revoked ?? []) === JSON.stringify(revoked)) {
      console.log("> nothing new to publish");
      return;
    }
    const indexArgs = [cli, "index", "--packages", out, "--out", out, "--key", keyFile, "--revoked", join(root, "revoked.json")];
    if (index) indexArgs.push("--previous", join(prev, "index.json"));
    process.stdout.write(run(process.execPath, indexArgs));
    try {
      run("gh", ["release", "view", RELEASE]);
    } catch {
      run("gh", ["release", "create", RELEASE, "--title", "Plugins", "--notes", "The marketplace of Zuna's native app: the signed index of verified plugins and their packages. Published by this repository's publishing job; nothing here is uploaded by hand."], { stdio: "inherit" });
    }
    const files = readdirSync(out).filter((name) => name.endsWith(".zunaplugin")).map((name) => join(out, name));
    // The packages first, so the index never names one that isn't there yet.
    if (files.length) run("gh", ["release", "upload", RELEASE, ...files], { stdio: "inherit" });
    run("gh", ["release", "upload", RELEASE, join(out, "index.json.sig"), join(out, "index.json"), "--clobber"], { stdio: "inherit" });
    console.log(`> published ${fresh.map(({ manifest }) => `${manifest.id} ${manifest.version}`).join(", ") || "a new index"}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const [command, ...rest] = process.argv.slice(2);
if (command === "check") check(rest);
else if (command === "publish") publish();
else {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 12).join("\n"));
  process.exit(command ? 1 : 0);
}
