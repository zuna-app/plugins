import { definePlugin } from "@zuna/plugin";

// Each command puts its face in the message box, after whatever was written with it:
// "/shrug no idea" gives "no idea ¯\_(ツ)_/¯". It reads nothing and sends nothing itself.
const FACES: Record<string, string> = {
  shrug: "¯\\_(ツ)_/¯",
  tableflip: "(╯°□°)╯︵ ┻━┻",
  unflip: "┬─┬ノ( º _ ºノ)",
  lenny: "( ͡° ͜ʖ ͡°)",
  disapprove: "ಠ_ಠ",
};

export default definePlugin((zuna) => {
  for (const [command, face] of Object.entries(FACES)) {
    zuna.commands.on(command, ({ composer, args }) => composer.insert(args ? `${args} ${face}` : face));
  }
});
