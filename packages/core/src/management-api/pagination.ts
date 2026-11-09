// Generic "fetch every page" loop for Auth0 Management API list endpoints that follow the
// default list behavior: a plain array response per page, requested with page/per_page. This is
// entity-agnostic by design - it knows nothing about clients, users, or any other resource, only
// how to walk pages. An entity's list() method supplies fetchPage, closing over its own request
// builder and whatever filter params the caller passed; this function just drives the loop.
//
// Stops at the first page shorter than the requested page size (including empty). On a tenant
// where the item count happens to be an exact multiple of per_page, that costs one extra, empty
// request - a deliberate trade for not depending on include_totals/total, whose field name
// (clients, users, ...) differs per entity's paginated response envelope.

const DEFAULT_PAGE_SIZE = 100;

export interface PaginateAllOptions {
  perPage?: number;
}

export async function paginateAll<TItem>(
  fetchPage: (pageParams: { page: number; per_page: number }) => Promise<TItem[]>,
  options?: PaginateAllOptions
): Promise<TItem[]> {
  const perPage = options?.perPage ?? DEFAULT_PAGE_SIZE;
  const items: TItem[] = [];
  let page = 0;

  for (;;) {
    const pageItems = await fetchPage({ page, per_page: perPage });
    items.push(...pageItems);

    if (pageItems.length < perPage) break;
    page += 1;
  }

  return items;
}
