import { definePlugin } from "@zuna/plugin";

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The muted words as one pattern, whole words in any case, or null with none. */
export function pattern(words: string): RegExp | null {
  const list = words
    .split(",")
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && word.length <= 100)
    .slice(0, 200);
  if (list.length === 0) return null;
  return new RegExp(`(^|[^\\p{L}\\p{N}_])(${list.map(escape).join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");
}

// A message with a muted word is hidden on this device, under the app's own line saying so, with
// one click to see it; or with "Hide them" off, only marked. Nothing of it is kept or sent.
export default definePlugin((zuna) => {
  let muted = pattern(zuna.settings.get<string>("words") ?? "");
  zuna.settings.onChange((key, value) => {
    if (key === "words") muted = pattern(typeof value === "string" ? value : "");
  });
  zuna.messages.decorate((message) => {
    if (!muted || !muted.test(message.text)) return null;
    return zuna.settings.get<boolean>("hide") ? { hidden: true } : { mark: { icon: "eye-off", label: "Muted word" } };
  });
});
