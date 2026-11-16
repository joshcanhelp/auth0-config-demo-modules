// Supporting files only - no CLI command here. A project's own serve.ts wires these pieces into
// routes itself (and runs directly via `tsx serve.ts` / `npm start`) - see this package's README
// for why.
export { createApp } from "./createApp.js";
export { detectLoginMethod } from "./detectLoginMethod.js";
export { handleChangePasswordEmail } from "./handleChangePasswordEmail.js";
export { handleChangePasswordLink } from "./handleChangePasswordLink.js";
export { handleVerifyEmail } from "./handleVerifyEmail.js";
export { handleLoginRedirect } from "./handleLoginRedirect.js";
export { handleLogout } from "./handleLogout.js";
export { handleCreateUser } from "./handleCreateUser.js";
export { handleSearchUsers } from "./handleSearchUsers.js";
export { handleStoreIdToken } from "./handleStoreIdToken.js";
export { handleSessionTransfer } from "./handleSessionTransfer.js";
export { renderClientPage } from "./pages/renderClientPage.js";
export { renderCallbackPage } from "./pages/renderCallbackPage.js";
export { resolveBaseUrl } from "./updateClientUrls.js";
