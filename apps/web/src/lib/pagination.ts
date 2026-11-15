/**
 * Extrae y valida parámetros de paginación desde query string.
 * Solo activa paginación cuando el parámetro `page` está presente para mantener
 * compatibilidad con selectores y exportaciones que consumen listas completas.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultPageSize = 25
): {
  hasPagination: boolean;
  page: number;
  pageSize: number;
  skip: number | undefined;
  take: number | undefined;
} {
  const hasPagination = searchParams.has("page");
  const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const parsedPageSize = Number.parseInt(
    searchParams.get("pageSize") || String(defaultPageSize),
    10
  );
  const pageSize = Number.isNaN(parsedPageSize)
    ? defaultPageSize
    : Math.min(100, Math.max(10, parsedPageSize));

  return {
    hasPagination,
    page,
    pageSize,
    skip: hasPagination ? (page - 1) * pageSize : undefined,
    take: hasPagination ? pageSize : undefined,
  };
}

export function buildPaginationMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
