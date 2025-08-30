// Limit the middleware to paths starting with `/api/`
export const config = {
  matcher: "/_probes/:type+",
};

export function middleware() {
  return new Response("Happy Cooking!", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
