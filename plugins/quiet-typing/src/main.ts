import { definePlugin } from "@zuna/plugin";

// Asked before the app says the person is typing, and before it marks messages read: false keeps
// it from going. Nothing else passes through it.
export default definePlugin((zuna) => {
  zuna.activity.onTyping(() => (zuna.settings.get<boolean>("typing") ? false : undefined));
  zuna.activity.onRead(() => (zuna.settings.get<boolean>("reads") ? false : undefined));
});
