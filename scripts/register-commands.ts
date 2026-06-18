/**
 * Registers the agent's Discord slash commands.
 *
 * Run:
 *   node --env-file=.env scripts/register-commands.ts            # global (~1h propagation)
 *   node --env-file=.env scripts/register-commands.ts <GUILD_ID> # guild-scoped (instant)
 *
 * Needs DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in the environment.
 * A PUT replaces the full command set for that scope (global or guild).
 */

const commands = [
  {
    name: "mike",
    description: "Ask the mike agent",
    type: 1, // CHAT_INPUT
    options: [
      {
        name: "message",
        description: "What should mike do?",
        type: 3, // STRING — lines up with eve's default prompt extraction
        required: true,
      },
    ],
  },
];

const appId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.argv[2]; // optional: register to one guild for instant propagation

if (!appId || !botToken) {
  console.error(
    "Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN. Pass via --env-file=.env.",
  );
  process.exit(1);
}

const scope = guildId ? `guilds/${guildId}/` : "";
const url = `https://discord.com/api/v10/applications/${appId}/${scope}commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

const body = await res.text();

if (!res.ok) {
  console.error(`Registration failed (${res.status}):\n${body}`);
  process.exit(1);
}

console.log(
  `Registered ${commands.length} command(s) ${guildId ? `to guild ${guildId}` : "globally"}.`,
);
console.log(body);
