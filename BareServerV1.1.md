# Bare Server V1 Endpoints

All endpoints are prefixed with `/v{version}/`

The endpoint `/` on V1.1 would be `/v1.1/`

## Request the server to fetch a URL from the remote.

Refer to [version 1 `/`](https://github.com/tomphttp/specifications/blob/master/BareServerV1.md#request-the-server-to-fetch-a-url-from-the-remote).

## Request a new WebSocket ID.

Request headers are almost identical to `/` with the exception of protocol.

| Method | Endpoint     |
| ------ | ------------ |
| `GET`  | /ws-new-meta |

Request Headers:

```
X-Bare-Host: example.org
X-Bare-Port: 80
X-Bare-Protocol: ws:
X-Bare-Path: /websocket
X-Bare-Headers: {"Host":"example.org","Upgrade":"WebSocket","Origin":"http://example.org","Connection":"upgrade"}
X-Bare-Forward-Headers: ["accept-encoding","accept-language","sec-websocket-extensions","sec-websocket-key","sec-websocket-version"]
```

All `X-Bare-` headers are required. Not specifying a header will result in a 400 status code. All headers are not tampered with, whatever is specified will go directly to the destination.

- X-Bare-Host: The host of the destination WITHOUT the port. This would be equivalent to `URL.hostname` in JavaScript.
- X-Bare-Port: The port of the destination. This must be a valid number. This is not `URL.port`, rather the client needs to determine what port a URL goes to. An example of logic done a the client: the protocol `http:` will go to port 80 if no port is specified in the URL.
- X-Bare-Protocol: The protocol of the destination. V1,1 Bare Servers support `ws:` and `wss:`. If the protocol is not either, this will result in a 400 status code.
- X-Bare-Path: The path of the destination. Be careful when specifying a path without `/` at the start. This may result in an error from the remote.
- X-Bare-Headers: A JSON-serialized object containing request headers. Request header names may be capitalized. When making the request to the remote, capitalization is kept. Consider the header capitalization on `HTTP/1.0` and `HTTP/1.1`. Sites such as Discord check for header capitalization to make sure the client is a web browser.
- X-Bare-Forward-Headers: A JSON-serialized array containing names of case-insensitive request headers to forward to the remote. For example, if the client's useragent automatically specified the `Accept` header and the client can't retrieve this header, it will set X-Bare-Forwarded-Headers to `["accept"]`. The Bare Server will read the `accept` header from the request headers (not X-Bare-Headers`) and add it to the headers sent to the remote. The server will automatically forward the following headers: Content-Encoding, Content-Length, Transfer-Encoding

Response Headers:

```
Content-Type: text/plain
```

Response Body:

The response is a unique sequence of hex encoded bytes. This should be stored until the WebSocket is open.

```
ABDCFE009023
```

## Request the server to create a WebSocket tunnel to the remote.

| Method | Endpoint  |
| ------ | --------- |
| `GET`  | /         |

Request Headers:

```
Upgrade: websocket
Sec-WebSocket-Protocol: bare
```

Response Headers:

```
Sec-WebSocket-Protocol: bare
```

Sec-WebSocket-Protocol: The first value in the list of protocols the client sent.

Response Body:

The response is a stream, forwading bytes from the remote to the client. Once either the remote or client close, the remote and client will close.

## Request the metadata for a specific WebSocket

| Method | Endpoint |
| ------ | -------- |
| `GET`  | /ws-meta |

Request Headers:

```
X-Bare-ID: UniqueID_123
```

- X-Bare-ID: The unique ID returned by the server in the pre-request.

> ⚠ All WebSocket metadata is cleared 30 seconds after the connection was established.

An expired or invalid X-Bare-ID will result in a 400 status code.

Response Headers:

```
Content-Type: application/json
```

Response Body:

```json
{
	"headers": {
		"Set-Cookie": [
			"Cookie",
			"Cookie"
		],
		"Sec-WebSocket-Accept": "original_websocket_protocol",
		"Sec-WebSocket-Extensions": "original_websocket_extensions"
	}
}
```
