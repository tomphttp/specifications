# Bare Server V2 Endpoints

All endpoints are prefixed with `/v{version}/`

The endpoint `/` on V2 would be `/v2/`

## Header Lists

Bare Server V2 adapts header lists.

See [RFC 8941: Structured Field Values for HTTP](https://www.rfc-editor.org/rfc/rfc8941.html#section-3.1)

## Split Headers

See implementation at https://github.com/tomphttp/bare-server-node/blob/master/splitHeaderUtil.js

Due to very popular webservers forbidding very long header values, headers on V2 will be split. If x header value is over **3072** Bytes (3.5 KB), **do not expect a response from the server**. If the server receives the large header, it will send a a [`INVALID_BARE_HEADER`](./BareServerErrors.md) error. If the server doesn't receive the header, the response may vary in status codes depending on the server.

Currently, header splitting only applies to X-Bare-Headers. Headers are split in both requests and responses. Split headers IDs begin from 0. A split header name looks like X-Bare-Split-ID. Every split value must begin with a semicolon, otherwise whitespace may be lost.

Example:

```
X-Bare-Headers-0: ;{"accept":"*/*","host":"example.com","sec-ch-ua":"\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\""
X-bare-Headers-1: ;,"sec-ch-ua-mobile":"?0","sec-ch-ua-platform":"\"Linux\"","user-agent":"Mozilla/5.0 (X11; Linux x8
X-Bare-Headers-2: ;6_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4890.0 Safari/537.36"}
```

The receiver should iterate over the headers, sort by ID, then combine all the values into the target header.

## Forbidden values

X-Bare-Forward-Headers:

`connection`, `transfer-encoding', 'host', 'connection', 'origin', 'referer`

X-Bare-Pass-Headers:

`vary`, `connection`, `transfer-encoding`, `access-control-allow-headers`, `access-control-allow-methods`, `access-control-expose-headers`, `access-control-max-age`, `access-cntrol-request-headers`, `access-control-request-method`

## Default values

Cache: If the query key `cache` is passed to any request endpoint, cache will be enabled. An effective query key value is a checksum of the protocol, host, port, and path. Any value is accepted.

X-Bare-Pass-Headers:

Cache:

`last-modified`, `etag`, `cache-control`

X-Bare-Forward-Headers:

`accept-encoding`, `accept-language`, `sec-websocket-extensions`, `sec-websocket-key`, `sec-websocket-version`

Cache:

`if-modified-since`, `if-none-match`, `cache-control`

X-Bare-Pass-Status:

Cache:

`304`

## Bare Request Headers

Example:
```
X-Bare-Port: 80
X-Bare-Protocol: http:
X-Bare-Path: /index.php
X-Bare-Headers: {"Host":"example.org","Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"}
```

- X-Bare-Port: The port of the destination. This must be a valid number and cannot be empty. An example of logic the client must do is: `const short port = protocol == "http:" ? 80 : 443;`
- X-Bare-Protocol: The protocol the server will use when creating a request. Valid values are: `http:`, `https:`
- X-Bare-Path: The server request path.
- X-Bare-Headers: A JSON-serialized object containing the server request headers. Request header names may be capitalized. When making the request to the remote, capitalization is kept. Consider the header capitalization on `HTTP/1.0` and `HTTP/1.1`. Sites such as Discord check for header capitalization to make sure the client is a web browser.
- **Optional:** X-Bare-Forward-Headers: A [list](#header-lists) of case-insensitive request headers to forward to the remote. For example, if the client's useragent automatically specified the `Accept` header and the client can't retrieve this header, the client should specify `Accept` as a forwarded header.
- **Optional:** X-Bare-Pass-Headers: A [list](#header-lists) of case-insensitive headers. If these headers are present in the remote response, the values will be added to the server response.
- **Optional:** X-Bare-Pass-Status: A [list](#header-lists) of HTTP status codes. If the remote response status code is present in this list, the server response status will be set to the remote response status.

## Bare Response Headers

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

## Send and receive data from a remote

| Method | Endpoint   |
| ------ | ---------- |
| `*`    | /          |

Request Body:

Request Headers:

See [Bare Request Headers](#bare-request-headers)

Response Headers:

See [Bare Response Headers](#bare-response-headers)

Response Body:

The remote's response body will be sent as the response body.

## Request a new WebSocket ID

Request headers are almost identical to `/` with the exception of protocol.

| Method | Endpoint     |
| ------ | ------------ |
| `GET`  | /ws-new-meta |

See [Bare Request Headers](#bare-request-headers)

Example:
```
X-Bare-Host: example.org
X-Bare-Port: 80
X-Bare-Protocol: ws:
X-Bare-Path: /websocket
X-Bare-Headers: {"Host":"example.org","Upgrade":"WebSocket","Origin":"http://example.org","Connection":"upgrade"}
```

Response Headers:

```
Content-Type: text/plain
```

Response Body:

A random WebSocket-protocol-safe character sequence used to identify the WebSocket and it's metadata. 

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
Sec-WebSocket-Protocol: bare, ...
```

Sec-WebSocket-Protocol: The protocol is the meta ID. 

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

See [Bare Response Headers](#bare-response-headers)
