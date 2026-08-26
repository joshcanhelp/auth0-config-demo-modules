import { createApp } from "./src/app/createApp.js";
import { selectTenant } from "./src/scripts/utils/selectTenant.js";
import { handleCreateUser } from "./src/app/handleCreateUser.js";
import { handleLoginRedirect } from "./src/app/handleLoginRedirect.js";
import { handleLogout } from "./src/app/handleLogout.js";
import { handleSearchUsers } from "./src/app/handleSearchUsers.js";
import { renderClientListPage } from "./src/app/renderClientListPage.js";
import { renderClientPage } from "./src/app/renderClientPage.js";
import { renderTokenPage } from "./src/app/renderTokenPage.js";
import { resolveBaseUrl } from "./src/app/updateClientUrls.js";

const { tenantDir } = await selectTenant();

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

app.get("/client/:clientId", anyClientMiddleware, (_request, response) => {
  return renderClientPage({ response, env: process.env });
});

app.get("/logout", (request, response) => {
  return handleLogout({ request, response, env: process.env });
});

app.get("/login/:clientId", loginableClientMiddleware, (request, response) => {
  return handleLoginRedirect({ request, response, env: process.env });
});

app.get("/callback/:clientId", loginableClientMiddleware, async (request, response) => {
  return renderTokenPage({ request, response, env: process.env });
});

app.post(
  "/create-user/:clientId",
  anyClientMiddleware,
  createUsersClientMiddleware,
  (request, response) => {
    return handleCreateUser({ request, response, env: process.env });
  }
);

app.post(
  "/search-users/:clientId",
  anyClientMiddleware,
  readUsersClientMiddleware,
  (request, response) => {
    return handleSearchUsers({ request, response, env: process.env });
  }
);

const port = process.env.PORT ?? "3000";
app.listen(port, () => {
  console.log(`Server running at ${resolveBaseUrl(process.env)} on port ${port}`);
});
