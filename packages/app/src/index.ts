// Supporting files only - no CLI command here. A project's own serve.ts wires these pieces into
// routes itself (and runs directly via `tsx serve.ts` / `npm start`) - see this package's README
// for why.
export { createApp } from "./createApp.js";
export { detectLoginMethod } from "./detectLoginMethod.js";
export { handleChangePasswordEmail } from "./routes/change-password-email/handler.js";
export { handleChangePasswordLink } from "./routes/change-password-link/handler.js";
export { handleVerifyEmail } from "./routes/verify-email/handler.js";
export { handleLoginRedirect } from "./routes/login/handler.js";
export { handleLogout } from "./routes/logout/handler.js";
export { handleCreateUser } from "./routes/create-user/handler.js";
export { handleSearchUsers } from "./routes/search-users/handler.js";
export { handleStoreIdToken } from "./routes/store-id-token/handler.js";
export { handleSessionTransfer } from "./routes/session-transfer/handler.js";
export { renderClientPage } from "./routes/client/handler.js";
export { renderCallbackPage } from "./routes/callback/handler.js";
export { resolveBaseUrl } from "./updateClientUrls.js";
