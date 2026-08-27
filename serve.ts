import { createApp } from "./src/app/createApp.js";
import { selectTenant } from "./src/scripts/utils/selectTenant.js";
import { handleChangePasswordEmail } from "./src/app/handleChangePasswordEmail.js";
import { handleChangePasswordLink } from "./src/app/handleChangePasswordLink.js";
import { handleLoginRedirect } from "./src/app/handleLoginRedirect.js";
import { renderClientListPage } from "./src/app/pages/renderClientListPage.js";
import { renderClientPage } from "./src/app/pages/renderClientPage.js";
import { renderCallbackPage } from "./src/app/pages/renderCallbackPage.js";
import { resolveBaseUrl } from "./src/app/updateClientUrls.js";
import { handleLogout } from "./src/app/handleLogout.js";

const { tenantDir } = await selectTenant();

const { app, anyClientMiddleware, loginableClientMiddleware } =
  await createApp(tenantDir);

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

app.get("/login/:clientId", loginableClientMiddleware, (request, response) => {
  return handleLoginRedirect({ request, response, env: process.env });
});

app.get("/logout", (request, response) => {
  return handleLogout({ request, response, env: process.env });
});

app.get("/callback/:clientId", loginableClientMiddleware, async (request, response) => {
  return renderCallbackPage({ request, response, env: process.env });
});

const port = process.env.PORT ?? "3000";
app.listen(port, () => {
  console.log(`Server running at ${resolveBaseUrl(process.env)} on port ${port}`);
});
