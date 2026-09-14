import { pageLayout } from "./pageLayout.js";
import type { Auth0Client, TenantConfig } from "../../types.js";

function renderUserRows(users: Record<string, unknown>[]): string {
  if (users.length === 0) {
    return `<tr><td colspan="3">No users found.</td></tr>`;
  }

  return users
    .map((user) => {
      const name = (user.name as string) ?? (user.username as string) ?? "-";
      const email = (user.email as string) ?? "-";
      const userId = (user.user_id as string) ?? "-";
      return `<tr>
        <td>${name}</td>
        <td>${email}</td>
        <td><code>${userId}</code></td>
      </tr>`;
    })
    .join("\n");
}

export function renderSearchUsersPage(
  client: Auth0Client,
  tenantConfig: TenantConfig,
  query: string,
  users: Record<string, unknown>[]
): string {
  return pageLayout({
    title: `User Search — ${client.name}`,
    tenantConfig,
    body: `
  <p><a href="/client/${client.client_id}">&larr; Back to ${client.name}</a></p>
  <h1>User Search — ${tenantConfig.friendlyName}</h1>
  <form method="post" action="/search-users/${client.client_id}">
    <div>
      <label for="query">Search query</label>
      <input type="text" id="query" name="query" value="${query.replace(/"/g, "&quot;")}">
    </div>
    <button type="submit">Search</button>
  </form>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>User ID</th>
      </tr>
    </thead>
    <tbody>
      ${renderUserRows(users)}
    </tbody>
  </table>`,
  });
}
