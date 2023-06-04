# Bare Server v3 Endpoints

All endpoints are prefixed with `/v{version}/`

The endpoint `/` on v3 would be `/v3/`

## Compact Header Encoding

X-Bare-Headers uses Compact Header Encoding, a new encoding designed to improve header size over JSON.
See the [specification and reference implementation](./compact-header-encoding/) for further information.

Compact Header Encoding uses a dictionary of 8930 IDs numbered from 0 to 8929 inclusive.
The dictionaries used in requests and responses shall be assigned in [this file](./BareHeaderDictionaries.md).

## Bare Request Headers

Example:
```
X-Bare-Port: 80
X-Bare-Protocol: http:
X-Bare-Path: /index.php
X-Bare-Headers: ; #Host5example.org %Accept#\text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
```

Bare headers:
- X-Bare-Port: The port of the destination. This must be a valid number and cannot be empty. An example of logic the client must do is: `const port = protocol == "http:" ? 80 : 443;`
- X-Bare-Protocol: The protocol the server will use when creating a request. Valid values are: `http:`, `https:`
- X-Bare-Path: The server request path.
- X-Bare-Headers: The CHE-serialized headers to be sent to the remote.

Headers forwarded to the remote:
- Accept-Encoding
- Accept-Language
- If-Modified-Since
- If-None-Match
- Cache-Control

## Bare Response Headers

```
Cache-Control: ...
ETag: ...
Content-Encoding: ...
Content-Length: ...
X-Bare-Status: 200
X-Bare-Status-text: OK
X-Bare-Headers: ; +Content-Type1text/html
```

Bare headers:
- Content-Encoding: The remote body's content encoding, if any.
- Content-Length: The remote body's content length, if any.
- Transfer-Encoding: The remote body's transfer encoding, if any.
- X-Bare-Status: The status code of the remote.
- X-Bare-Status-Text: The status text of the remote.
- X-Bare-Headers: The CHE-serialized headers sent by the remote.

Headers forwarded from the remote:
- Content-Encoding
- Transfer-Encoding
- Content-Length
- Last-Modified
- Etag
- Cache-Control

If the remote response's status is 304 or 204, then the Bare server must respond with that status instead of 200.

## Send data to and receive data from a remote

| Method | Endpoint   |
| -------- | -------------- |
| `*`    | /          |

Cache: The query string parameter `cache` is passed to the HTTP request endpoint. An effective parameter value is a checksum of the protocol, host, port, and path. However, any value is accepted.
Request headers: see [Bare Request Headers](#bare-request-headers)
Response headers: see [Bare Response Headers](#bare-response-headers)

The request body will be sent as the request body to the remote.
The remote's response body will be sent as the response body.

## Create a WebSocket tunnel to a remote

| Method | Endpoint  |
| -------- | ------------- |
| `GET`  | /         |

Example headers:
```
Upgrade: websocket
Sec-WebSocket-Protocol: some-client-chosen-protocol
```

The `Sec-WebSocket-Protocol` request header, if any, is forwarded to the remote.

Handshake:
1. The client must send a JSON-encoded object representing the remote URL and the `Cookie` header of the form `{remote: string, cookie: string | null}`.
2. The server must either:
    a. send a JSON-encoded object representing the `Sec-WebSocket-Protocol` and `Set-Cookie` headers of the form `{protocol: string | null, cookies: string[]}`.
    b. close the connection upon receiving invalid data or encountering a failure.
3. The client must close the connection upon receiving invalid data.
4. The WebSocket connection is now open for the proxied application.
5. Any message or closure from one connection is sent or applied respectively to the other.

Note:
* If at least 10 seconds have passed waiting for step 1 to be completed by the client, the server *may* close the connection.
* If at least 10 seconds have passed waiting for step 2 to be completed by the server, the client *may* close the connection.
