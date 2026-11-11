import { createApp } from "auth0-config-demo-modules/src/app/createApp.js";
import { selectTenant } from "auth0-config-demo-modules/src/scripts/utils/selectTenant.js";
import { handleChangePasswordEmail } from "auth0-config-demo-modules/src/app/handleChangePasswordEmail.js";
import { handleChangePasswordLink } from "auth0-config-demo-modules/src/app/handleChangePasswordLink.js";
import { handleVerifyEmail } from "auth0-config-demo-modules/src/app/handleVerifyEmail.js";
import { handleLoginRedirect } from "auth0-config-demo-modules/src/app/handleLoginRedirect.js";
import { handleCreateUser } from "auth0-config-demo-modules/src/app/handleCreateUser.js";
import { handleSearchUsers } from "auth0-config-demo-modules/src/app/handleSearchUsers.js";
import { handleStoreIdToken } from "auth0-config-demo-modules/src/app/handleStoreIdToken.js";
import { handleErrorPage } from "auth0-config-demo-modules/src/app/handleErrorPage.js";
import { handleSessionTransfer } from "auth0-config-demo-modules/src/app/handleSessionTransfer.js";
import { renderClientListPage } from "auth0-config-demo-modules/src/app/pages/renderClientListPage.js";
import { renderClientPage } from "auth0-config-demo-modules/src/app/pages/renderClientPage.js";
import { renderCallbackPage } from "auth0-config-demo-modules/src/app/pages/renderCallbackPage.js";
import { resolveBaseUrl } from "auth0-config-demo-modules/src/app/updateClientUrls.js";
import { handleLogout } from "auth0-config-demo-modules/src/app/handleLogout.js";

const { tenantDir } = await selectTenant({ requireTenantType: false });

const {
  app,
  anyClientMiddleware,
  loginableClientMiddleware,
  createUsersClientMiddleware,
  readUsersClientMiddleware,
} = await createApp(tenantDir);

app.get("/", (_request, response) => {
  return renderClientListPage({ response, env: process.env });
});

app.get("/client/:clientId", anyClientMiddleware, (request, response) => {
  return renderClientPage({ request, response, env: process.env });
});

app.get(
  "/change-password-email/:clientId",
  loginableClientMiddleware,
  async (request, response) => {
    return handleChangePasswordEmail({ request, response, env: process.env });
  }
);

app.get(
  "/change-password-link/:clientId",
  loginableClientMiddleware,
  async (request, response) => {
    return handleChangePasswordLink({ request, response, env: process.env });
  }
);

app.post(
  "/change-password-link/:clientId",
  loginableClientMiddleware,
  async (request, response) => {
    return handleChangePasswordLink({ request, response, env: process.env });
  }
);

app.get(
  "/verify-email/:clientId",
  loginableClientMiddleware,
  async (request, response) => {
    return handleVerifyEmail({ request, response, env: process.env });
  }
);

app.get("/login/:clientId", loginableClientMiddleware, (request, response) => {
  return handleLoginRedirect({ request, response, env: process.env });
});

app.get("/logout", (request, response) => {
  return handleLogout({ request, response, env: process.env });
});

app.get("/callback/:clientId", loginableClientMiddleware, async (request, response) => {
  return renderCallbackPage({ request, response, env: process.env });
});

app.post("/store-id-token", (request, response) => {
  return handleStoreIdToken({ request, response });
});

app.post(
  "/create-user/:clientId",
  anyClientMiddleware,
  createUsersClientMiddleware,
  async (request, response) => {
    return handleCreateUser({ request, response, env: process.env });
  }
);

app.post(
  "/search-users/:clientId",
  anyClientMiddleware,
  readUsersClientMiddleware,
  async (request, response) => {
    return handleSearchUsers({ request, response, env: process.env });
  }
);

app.get("/error-page", (request, response) => {
  return handleErrorPage({ request, response, env: process.env });
});

const sessionTransferSubjectTokenType = process.env.SESSION_TRANSFER_SUBJECT_TOKEN_TYPE;
if (sessionTransferSubjectTokenType) {
  app.get("/session-transfer", async (request, response) => {
    return handleSessionTransfer({
      request,
      response,
      env: process.env,
      subjectTokenType: sessionTransferSubjectTokenType,
    });
  });
}

const port = process.env.PORT ?? "3000";
app.listen(port, () => {
  console.log(`Server running at ${resolveBaseUrl(process.env)} on port ${port}`);
});
