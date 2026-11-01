import { httpBasic } from "eve/channels/auth";
import { discordChannel } from "eve/channels/discord";

// No onCommand/onAnswers/onMessage: the defaults give messages and button presses the same
// identity, which keeps requester-only approvals working.
export default discordChannel({
  gateway: {
    // An unset secret stops startup in agent/instrumentation/require-relay-secret.ts.
    auth: httpBasic({ username: "discord-relay", password: process.env.DISCORD_RELAY_SECRET ?? "" }),
  },
});
