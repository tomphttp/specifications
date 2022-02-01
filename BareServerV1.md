# Bare Server V1 Endpoints

[Implementation](https://github.com/tomphttp/bare-server-node/blob/master/V1.mjs)

## Request the server to fetch a URL from the remote.

| Method | Endpoint  |
| - | - |
| `POST`/`GET` | /v1/ |

Request Body:

The body will be ignored if the request was made as `GET`. The request body will be forwarded to the remote request made by the bare server.

Request Headers:

```
x-bare-host: example.org
x-bare-port: 80
x-bare-protocol: http:
x-bare-path: /index.php
x-bare-headers: {"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"}
x-bare-forward-headers: ["accept-encoding","accept-language"]
```

All headers are required. Not specifying a header will result in a 400 status code. All headers are not tampered with, whatever is specified will go directly to the destination.

x-bare-host: The host of the destination WITHOUT the port. This would be equivalent to `URL.hostname` in JavaScript.

x-bare-port: The port of the destination. This must be a valid number. This is not `URL.port`, rather the client needs to determine what port a URL goes to. An example of logic done a the client: the protocol `http:` will go to port 80 if no port is specified in the URL.

x-bare-protocol: The protocol of the destination. V1 bare servers support `http:` and `https:`. If the protocol is not either, this will result in a 400 status code.

x-bare-path: The path of the destination. Be careful when specifying a path without `/` at the start. This may result in an error from the remote.

x-bare-headers: A JSON-serialized object containing request headers. Request header names may be capitalized. When making the request to the remote, capitalization is kept. Consider the header capitalization on `HTTP/1.0` and `HTTP/1.1`. Sites such as Discord check for header capitalization to make sure the client is a web browser.

x-bare-forward-headers: A JSON-serialized array containing names of case-insensitive request headers to forward to the remote. For example, if the client's useragent automatically specified the `Accept` header and the client can't retrieve this header, it will set x-bare-forwarded-headers to `["accept"]`. The Bare Server will read the `accept` header from the request headers (not x-bare-headers`) and add it to the headers sent to the remote.

Response Headers:

```
x-bare-status: 200
x-bare-status-text: OK
x-bare-headers: {"Content-Type": "text/html"}
```

x-bare-status: The status code of the remote.

x-bare-status-text: The status text of the remote.

x-bare-headers: A JSON-serialized object containing remote response headers. Response headers may be capitalized if the remote sent any capitalized headers.

Response Body:

The remote's response body will be sent as the response body.

## Request the server to create a WebSocket tunnel to the remote.

| Method | Endpoint  |
| - | - |
| `GET` | / |


Request Headers:

```
...
Upgrade: websocket
Sec-WebSocket-Protocol: ...
...
```

All headers that aren't listed above are irrelevant. The WebSocket class in browsers can't specify request headers.

Sec-WebSocket-Protocol: This header contains 2 values: a dummy protocol to send to the client and an encoded, serialized, JSON object.

The JSON object looks like:

```json
{
	"remote": {
		"host": "example.org",
		"port": 80,
		"path": "/ws-path",
		"protocol": "ws:"
	},
	"headers": {
		"Origin": "http://example.org",
		"Sec-WebSocket-Protocol": "original_websocket_protocol"
	},
	"forward_headers": [
		"accept-encoding",
		"accept-language",
		"sec-websocket-extensions",
		"sec-websocket-key",
		"sec-websocket-version"
	]
}
```

This serialized JSON is then encoded. See [WebSocketProtocol.md](https://github.com/tomphttp/specifications/blob/master/WebSocketProtocol.md) for in-depth on this encoding.

Response Headers:

```
...
Sec-WebSocket-Protocol: ...
Sec-WebSocket-Accept: ...
...
```

Sec-WebSocket-Accept: The remote's accept header.

Sec-WebSocket-Protocol: The first value in the list of protocols the client sent.

All headers that aren't listed above are irrelevant. The WebSocket class in browsers can't access response headers.

Response Body:

The response is a stream containing bytes from the remote socket. Once the remote closes, this stream closes. Once the client closes, the remote closes.
