import { discordChannel } from "eve/channels/discord";

export default discordChannel({
  // Auth derived from the invoking Discord user. Return null to drop.
  onCommand: (ctx, interaction) => ({
    auth: {
      principalId: interaction.user.id,
      principalType: "user",
      authenticator: "discord",
      attributes: {
        channel_id: interaction.channelId,
        guild_id: interaction.guildId ?? "",
      },
    },
  }),
  events: {
    "message.completed"(eventData, channel, ctx) {
      // Skip intermediate tool-call turns; only deliver final text.
      if (eventData.finishReason === "tool-calls") return;
      if (eventData.message) channel.discord.post(eventData.message);
    },
  },
});
