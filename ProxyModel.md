# Proxy Model

- [Implementation](https://github.com/tomphttp/toomanyproxies)

The TompHTTP Proxy Model has 3 components: The Bare Server, Client, and Service Worker.

## The client's job:

The TompHTTP
Hook JavaScript functions that will create a request.

Such as `fetch(url, opts)`, `XMLHTTPRequest.prototype.open(method, url, ...etc)`.

Each request from the client will have a service: `worker:js`, `worker:html`, `worker:css`, `worker:binary` that the Service Worker will use to determine the appropiate rewriting method.

## The Bare Server's job:

See [BareServerV1.md](https://github.com/tomphttp/specifications/blob/master/BareServerV1.md) for specifications.

The TompHTTP Bare Server must provide an origin that will faciliate making requests to a remote server. The server will return unmodified data, leaving the work of rewriting and processing headers up to the Service Worker.

### The Service Worker's job:

The Service Worker will intercept requests containing directives to access resources used as HTML, JS, CSS, or raw binary data. The request will contain the remote URL's host, port, protocol, and path. This URL data will be passed onto the appropiate fields when making the request to the bare server. The Bare Server origin can be changed or swapped in the service worker's configuration. This configuration is accessed by the service worker's script URL. The service worker will rewrite request headers to be sent to the remote, making the request look identical to one coming from the remote URL. The response header will contain the unmodified response data. This data will be rewritten according to the resource directive specified by the request.
