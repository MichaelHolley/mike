import { discordChannel } from "eve/channels/discord";

// Shared by commands and answers so requester-only approvals match the requester.
const auth = (interaction: {
  user: { id: string; username: string };
  channelId: string;
  guildId?: string;
}) => ({
  auth: {
    principalId: interaction.user.id,
    principalType: "user" as const,
    authenticator: "discord",
    attributes: {
      channel_id: interaction.channelId,
      guild_id: interaction.guildId ?? "",
      // Names the speaker in replayed chat history; a snowflake id is
      // useless to the model in a multi-speaker channel.
      username: interaction.user.username,
    },
  },
});

export default discordChannel({
  onCommand: (_ctx, interaction) => auth(interaction),
  // A custom onCommand makes eve drop every button press unless onAnswers is set too.
  onAnswers: (_ctx, interaction) => auth(interaction),
});
