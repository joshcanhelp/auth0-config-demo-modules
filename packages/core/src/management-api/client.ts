// The shared, mechanical executor for every Management API call. It holds the domain/token so
// callers never pass them per call, and knows how to turn a request descriptor into an HTTP call
// (base URL, auth header, query serialization, response/error parsing). It knows nothing about
// what any particular endpoint means or any Auth0-specific rules - that's the entity modules'
// job (see clients/), which build descriptors for this client to execute.

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestDescriptor {
  method: HttpMethod;
  path: string;
  // `object` rather than `Record<string, unknown>` - the SDK's per-endpoint params interfaces
  // (e.g. Management.GetClientRequestParameters) have no string index signature, so they aren't
  // structurally assignable to Record<string, unknown> even though every property is.
  query?: object;
  body?: unknown;
}

export interface ManagementApiClient {
  request<T>(descriptor: RequestDescriptor): Promise<T>;
}

export interface ManagementApiClientOptions {
  domain: string;
  token: string;
}

function buildUrl(domain: string, path: string, query?: object): string {
  const url = new URL(`https://${domain}/api/v2${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const result = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(`Failed to ${path}: (${response.status}) ${result.message ?? ""}`);
  }
  return result;
}

export function createManagementApiClient(
  options: ManagementApiClientOptions
): ManagementApiClient {
  const { domain, token } = options;

  return {
    async request<T>({ method, path, query, body }: RequestDescriptor): Promise<T> {
      console.log(`${method} to ${path}`, body ?? "");

      const response = await fetch(buildUrl(domain, path, query), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      return parseResponse<T>(response, path);
    },
  };
}
