import { defineInstrumentation } from "eve/instrumentation";

// Channel modules also load at build time, where the secret is absent, so the boot check lives here.
export default defineInstrumentation({
  setup() {
    if (!process.env.DISCORD_RELAY_SECRET) {
      throw new Error("DISCORD_RELAY_SECRET is not set; refusing to serve an unauthenticated Discord Gateway route");
    }
  },
});
