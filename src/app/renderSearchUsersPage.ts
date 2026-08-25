import { pageLayout } from "./pageLayout.js";
import type { Auth0Client, TenantConfig } from "../types.js";

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
    styles: `
    form { display: flex; gap: 0.5rem; align-items: flex-end; margin-bottom: 1.5rem; }
    label { font-weight: bold; display: block; margin-bottom: 0.25rem; }
    input[type="text"] { padding: 0.4rem; font-size: 1rem; width: 400px; }
    button { padding: 0.4rem 1.25rem; font-size: 1rem; cursor: pointer; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: 0.5rem 1rem; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    code { font-size: 0.85em; }`,
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
