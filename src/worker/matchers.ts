export type RouteContext = {
  readonly request: Pick<Request, "mode" | "headers">;
  readonly url: URL;
  readonly sameOrigin: boolean;
};

const SHOPPING_PATH = "/shopping";
const NEXT_STATIC_PREFIX = "/_next/static/";
const NEXT_IMAGE_PATH = "/_next/image";
const S3_HOST = /\.amazonaws\.com$/;
const RSC_HEADER = "RSC";
const RSC_QUERY = "_rsc";

const isNavigation = ({ request }: RouteContext) => request.mode === "navigate";

export const isRscRequest = ({ request, url }: RouteContext): boolean =>
  request.headers.get(RSC_HEADER) === "1" || url.searchParams.has(RSC_QUERY);

export const isShoppingNavigation = (context: RouteContext): boolean =>
  isNavigation(context) && context.url.pathname === SHOPPING_PATH;

export const isOtherNavigation = (context: RouteContext): boolean =>
  isNavigation(context) && context.url.pathname !== SHOPPING_PATH;

export const isNextStatic = ({ url, sameOrigin }: RouteContext): boolean =>
  sameOrigin && url.pathname.startsWith(NEXT_STATIC_PREFIX);

export const isImage = ({ url, sameOrigin }: RouteContext): boolean =>
  (sameOrigin && url.pathname === NEXT_IMAGE_PATH) ||
  S3_HOST.test(url.hostname);
