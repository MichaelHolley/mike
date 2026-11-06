import { httpBasic } from "eve/agents/auth";
import { runDiscordGatewayRelay } from "eve/experimental/channels/discord/gateway";

const url = process.env.EVE_URL;
const secret = process.env.DISCORD_RELAY_SECRET;
if (!url || !secret) throw new Error("EVE_URL and DISCORD_RELAY_SECRET must be set");

await runDiscordGatewayRelay({
  url,
  auth: httpBasic({ username: "discord-relay", password: secret }),
  // Turn on Message Content Intent in the Discord portal first, or Discord refuses the connection.
  messageContent: true,
});
