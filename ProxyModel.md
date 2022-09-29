# Proxy Model

This is merely a guideline for how you should create your service worker. As long as you follow the Bare server specifications, any implementation is fine.

The TompHTTP Proxy Model has 3 components:

## Bare server

See [BareServer.md](https://github.com/tomphttp/specifications/blob/master/BareServer.md) for specifications.

The Bare server must provide an origin that will faciliate making requests to a remote server. The server will return unmodified data (i.e no decompression, the content-encoding header is passed directly to the response), leaving the work of rewriting and processing headers to the service worker.

### Service worker

The Service worker will intercept requests from the client. The requests will either contain a directive or be part of a directive to a certiain resource. For example, in Stomp:

`/${SCOPE}/${ASSET}/${URL}`

- scope: `/service/`
- asset: `html`
- url: `https://sys32.dev/`

`/service/html/https%3A%2F%2Fsys32.dev%2F`

The URL was encoded using `encodeURIComponent` for safety with various webservers such as NGINX, Heroku, Repl.it, etc... These services may replace `https://sys32.dev` with `https:/sys32.dev`, breaking the URL.

The URL should contain fields that correspond to fields used when making a request to the Bare server:

- Host: `sys32.dev`
- Port: `443`
- Protocol: `https:`
- Path: `/`

Some logic used to match these components may look like:

```js
// https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/registration
// Find out our current scope.
const { scope } = registration;

const splitURL = /^(js|css)\/(.*?)$/;

async function onFetch(request) {
	// isolate the content after /scope/ in the URL
	const sliced = request.url.slice(scope);
	// request.url = `http://localhost/scope/js/https%3A%2F%2Fsys32.dev%2F`
	// sliced = `js/https%3A%2F%2Fsys32.dev%2F`
	const [, service, url] = sliced.match(splitURL) || [];

	if (!service || !url) return new Response('Unknown URL', { status: 404 });

	const decodedURL = new URL(decodeURIComponent(url));

	// Do logic according to service...
}
```

### How it will look

You should attempt to produce an identical website (CSS, HTML, JS) by leveraging rewriting scripts. We recommend the following libraries:
- [parse5](https://www.npmjs.com/package/parse5)
- [meriyah](https://www.npmjs.com/package/meriyah)
- [acorn-loose](https://www.npmjs.com/package/acorn-loose)
- [magic-string](https://www.npmjs.com/package/magic-string) (used with acorn-loose)
- [@javascript-obfuscator/escodegen](https://www.npmjs.com/package/@javascript-obfuscator/escodegen)

Ideally, you want to take an approach where you only replace portions of the JavaScript code, instead of wasting resources re-generating it. Acorn-loose will sometimes produce invalid JS, however you will end up only replacing the JavaScript that is valid, which works flawlessly with magic-string.

You will end up rewriting request/response headers to produce an identical request/response as if the website were natively running.

#### Utilizing the Bare server

We recommend our official [Bare client package on NPM](https://www.npmjs.com/package/@tomphttp/bare-client). You may use this library in a variety of ways:

- import/require via modular service workers, rollup, and webpack 👍
- `<script>`/`importScripts()` 👍
- Embed in your service worker... 👎

We HIGHLY encourage you to make the Bare server URL configurable. If possible, allow the configuration to run logic in order to produce a Bare server URL.

## Client

Hook JavaScript functions that will create a request.

Such as `fetch(url, opts)`, `XMLHttpRequest.prototype.open(method, url, ...etc)`.

JS apis will have their responses unrewritten, and may contain data that calling `res.text()` will result in being lost. Run logic to determine what to convert the response to.

Example:
- `/xhr/`: Don't touch the response. Use `new Response(res.body)` to produce a response with the body being piped. Loads `fetch()`, `XMLHttpRequest`, and images.
- `/js/`: Covert to a string using `res.text()` then rewrite.
- `/css/`: Covert to a string using `res.text()` then rewrite.
- `/html/`: Covert to a string using `res.text()` then rewrite.
