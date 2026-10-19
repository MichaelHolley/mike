import { eveChannel } from "eve/channels/eve";
import { localDev } from "eve/channels/auth";

// Only Discord is used in production; the session API stays closed outside `eve dev`.
export default eveChannel({
  auth: [localDev()],
});
