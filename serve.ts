import { createApp } from "./src/app/createApp.js";
import { selectTenant } from "./src/scripts/utils/selectTenant.js";
import { handleChangePasswordEmail } from "./src/app/handleChangePasswordEmail.js";
import { handleChangePasswordLink } from "./src/app/handleChangePasswordLink.js";
import { handleLoginRedirect } from "./src/app/handleLoginRedirect.js";
import { renderClientListPage } from "./src/app/renderClientListPage.js";
import { renderClientPage } from "./src/app/renderClientPage.js";
import { renderTokenPage } from "./src/app/renderTokenPage.js";
import { resolveBaseUrl } from "./src/app/updateClientUrls.js";
import { handleLogout } from "./src/app/handleLogout.js";

const { tenantDir } = await selectTenant();

const { app, anyClientMiddleware, loginableClientMiddleware } =
  await createApp(tenantDir);

app.get("/", (_request, response) => {
  return renderClientListPage({ response, env: process.env });
});

app.get("/client/:clientId", anyClientMiddleware, (_request, response) => {
  return renderClientPage({ response, env: process.env });
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
  return renderTokenPage({ request, response, env: process.env });
});

const port = process.env.PORT ?? "3000";
app.listen(port, () => {
  console.log(`Server running at ${resolveBaseUrl(process.env)} on port ${port}`);
});
