/** Load the existing importer into the page being viewed. */
export function bookmarkletUrl(
  appRoot: string,
  apiRoot: string,
  token?: string,
) {
  const script = new URL(`${apiRoot.replace(/\/$/, "")}/import_bookmarklet.js`);
  script.searchParams.set("appRoot", appRoot.replace(/\/$/, ""));
  script.searchParams.set("apiRoot", apiRoot.replace(/\/$/, ""));
  if (token) script.searchParams.set("token", token);

  return `javascript:void(function(){var id="foodinger-import-bookmarklet";if(document.getElementById(id))return;var s=document.createElement("script");s.id=id;s.src=${JSON.stringify(script.href)}+"&_="+Date.now();s.onerror=function(){s.remove();alert("Cook This could not load. This website may block bookmarklets. Try another recipe website.");};document.body.appendChild(s);}())`;
}
