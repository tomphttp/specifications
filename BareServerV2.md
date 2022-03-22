# Bare Server V2 Endpoints

All endpoints are prefixed with `/v{version}/`

The endpoint `/` on V2 would be `/v2/`

## Split Headers

Due to very common webservers forbidding very long header values, headers on V2 will be split into smaller parts. If a `x-bare-` header value is over 2096 Bytes, **do not expect a response from the server**. If the server receives the large header, it will send a a [`INVALID_BARE_HEADER`](./BareServerErrors.md) error. If the server doesn't receive the header, the response may vary in status codes depending on the server.

Example:

```
X-Bare-Headers: {"accept":"*/*","host":"example.com","sec-ch-ua":"\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\""
X-bare-Headers-1:,"sec-ch-ua-mobile":"?0","sec-ch-ua-platform":"\"Linux\"","user-agent":"Mozilla/5.0 (X11; Linux x8
X-Bare-Headers-2: 6_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4890.0 Safari/537.36"}
```

The receiver should iterate over the headers and combine all the header values in order by their suffix.

This applies to both the client and server. Request headers may be split and response headers may be split.

## Forbidden Headers

Headers that are forbidden to pass-through:
- `Connection`

Headers that are forbidden to forward:
- `Host`
- `Connection`
- `Access-Control-*`
- `Cross-Origin-*`

Headers that are automatically passed-through:

- `Content-Encoding`
- `Content-Length`

## Send and receive data from a remote

| Method | Endpoint   |
| ------ | ---------- |
| `*`    | /          |

Request Body:

The body will be ignored if the request was made as `GET`. The request body will be forwarded to the remote request made by the bare server.

Request Headers:

```
X-Bare-Host: example.org
X-Bare-Port: 80
X-Bare-Protocol: http:
X-Bare-Path: /index.php
X-Bare-Headers: {"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"}
X-Bare-Forward-Headers: ["accept-encoding","accept-language"]
X-Bare-Pass-Headers: ["cache-control","etag"]
X-Bare-Pass-Status: [204,304]
```

All headers are required. Not specifying a header will result in a 400 status code. All headers are not tampered with, whatever is specified will go directly to the destination.

- X-Bare-Host: The host of the destination WITHOUT the port. This would be equivalent to `URL.hostname` in JavaScript.
- X-Bare-Port: The port of the destination. This must be a valid number. This is not `URL.port`, rather the client needs to determine what port a URL goes to. An example of logic done a the client: the protocol `http:` will go to port 80 if no port is specified in the URL.
- X-Bare-Protocol: The protocol of the destination. V1 bare servers support `http:` and `https:`. If the protocol is not either, this will result in a 400 status code.
- X-Bare-Path: The path of the destination. Be careful when specifying a path without `/` at the start. This may result in an error from the remote.
- X-Bare-Headers: A JSON-serialized object containing request headers. Request header names may be capitalized. When making the request to the remote, capitalization is kept. Consider the header capitalization on `HTTP/1.0` and `HTTP/1.1`. Sites such as Discord check for header capitalization to make sure the client is a web browser.
- X-Bare-Forward-Headers: A JSON-serialized array containing names of case-insensitive request headers to forward to the remote. For example, if the client's useragent automatically specified the `Accept` header and the client can't retrieve this header, it will set X-Bare-Forwarded-Headers to `["accept"]`. The Bare Server will read the `accept` header from the request headers (not X-Bare-Headers`) and add it to the headers sent to the remote. The server will automatically forward the following headers: Content-Encoding, Content-Length, Transfer-Encoding

### New in V2:
- X-Bare-Pass-Headers: A JSON-serialized array containing lowercase header names. The server will read these headers in the remote response and send them in the response. If a header is [forbidden](#forbidden-headers), the server will send a [`FORBIDDEN_BARE_HEADER`](./BareServerErrors.md) error.
- X-Bare-Pass-Status: A JSON-serialized array containing status codes. The server will read the status code in the remote response and set the status to the remote's status code if it matches one of the status codes in this header.

Response Headers:

```
Cache-Control: ...
ETag: ...
Content-Encoding: ...
Content-Length: ...
X-Bare-Status: 200
X-Bare-Status-text: OK
X-Bare-Headers: {"Content-Type": "text/html"}
```

- Content-Encoding: The remote body's content encoding.
- Content-Encoding: The remote body's content length.
- X-Bare-Status: The status code of the remote.
- X-Bare-Status-Text: The status text of the remote.
- X-Bare-Headers: A JSON-serialized object containing remote response headers. Response headers may be capitalized if the remote sent any capitalized headers.

Response Body:

The remote's response body will be sent as the response body.

A random character sequence used to identify the WebSocket and it's metadata. 

## Request a new WebSocket ID

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
X-Bare-Pass-Headers: []
X-Bare-Pass-Status: []
```

All `X-Bare-` headers are required. Not specifying a header will result in a 400 status code. All headers are not tampered with, whatever is specified will go directly to the destination.

- X-Bare-Host: The host of the destination WITHOUT the port. This would be equivalent to `URL.hostname` in JavaScript.
- X-Bare-Port: The port of the destination. This must be a valid number. This is not `URL.port`, rather the client needs to determine what port a URL goes to. An example of logic done a the client: the protocol `http:` will go to port 80 if no port is specified in the URL.
- X-Bare-Protocol: The protocol of the destination. V1,1 Bare Servers support `ws:` and `wss:`. If the protocol is not either, this will result in a 400 status code.
- X-Bare-Path: The path of the destination. Be careful when specifying a path without `/` at the start. This may result in an error from the remote.
- X-Bare-Headers: A JSON-serialized object containing request headers. Request header names may be capitalized. When making the request to the remote, capitalization is kept. Consider the header capitalization on `HTTP/1.0` and `HTTP/1.1`. Sites such as Discord check for header capitalization to make sure the client is a web browser.
- X-Bare-Forward-Headers: A JSON-serialized array containing names of case-insensitive request headers to forward to the remote. For example, if the client's useragent automatically specified the `Accept` header and the client can't retrieve this header, it will set X-Bare-Forwarded-Headers to `["accept"]`. The Bare Server will read the `accept` header from the request headers (not X-Bare-Headers`) and add it to the headers sent to the remote. The server will automatically forward the following headers: Content-Encoding, Content-Length, Transfer-Encoding

### New in V2:
- X-Bare-Pass-Headers: A JSON-serialized array containing lowercase header names. The server will read these headers in the remote response and send them in the response. If a header is [forbidden](#forbidden-headers), the server will send a [`FORBIDDEN_BARE_HEADER`](./BareServerErrors.md) error.
- X-Bare-Pass-Status: A JSON-serialized array containing status codes. The server will read the status code in the remote response and set the status to the remote's status code if it matches one of the status codes in this header.

Response Headers:

```
Content-Type: text/plain
```

Response Body:

The response is a unique sequence of hex encoded bytes. This should be stored until the WebSocket is open.

```
ABDCFE009023
```

## Create a WebSocket tunnel to a remote

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

## Receive metadata for a specific WebSocket

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