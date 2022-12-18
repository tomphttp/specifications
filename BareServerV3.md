# Bare Server v3 Endpoints

All endpoints are prefixed with `/v{version}/`

The endpoint `/` on v3 would be `/v3/`

## Header Lists

Bare Server v3 adapts header lists.

See [RFC 8941: Structured Field Values for HTTP](https://www.rfc-editor.org/rfc/rfc8941.html#section-3.1)

## Compact Header Encoding

X-Bare-Headers uses Compact Header Encoding, a new encoding designed to improve header size over JSON.
See the [specification and reference implementation](./compact-header-encoding/) for further information.

Compact Header Encoding uses a dictionary of 47 IDs numbered from 0 to 46 inclusive.
The dictionaries used in requests and responses are listed below:

### Requests

| Index |    0   |    1   |    2   |    3   |    4   |    5   |    6   |    7   |    8   |    9   |
| ----- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
|   0   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   1   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   2   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   3   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   4   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | ------ | ------ | ------ |

### Responses

| Index |    0   |    1   |    2   |    3   |    4   |    5   |    6   |    7   |    8   |    9   |
| ----- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
|   0   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   1   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   2   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   3   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |
|   4   | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | ------ | ------ | ------ |

## Forbidden values

X-Bare-Forward-Headers:

`connection`, `transfer-encoding`, `host`, `connection`, `origin`, `referer`

X-Bare-Pass-Headers:

`vary`, `connection`, `transfer-encoding`, `access-control-allow-headers`, `access-control-allow-methods`, `access-control-expose-headers`, `access-control-max-age`, `access-control-request-headers`, `access-control-request-method`

## Bare Request Headers

Example:
```
X-Bare-Port: 80
X-Bare-Protocol: http:
X-Bare-Path: /index.php
X-Bare-Headers: TODO
```

- X-Bare-Port: The port of the destination. This must be a valid number and cannot be empty. An example of logic the client must do is: `const port = protocol == "http:" ? 80 : 443;`
- X-Bare-Protocol: The protocol the server will use when creating a request. Valid values are: `http:`, `https:`
- X-Bare-Path: The server request path.
- X-Bare-Headers: TODO
- **Optional:** X-Bare-Forward-Headers: A [list](#header-lists) of case-insensitive request headers to forward to the remote. For example, if the client's user agent automatically specified the `Accept` header and the client can't retrieve this header, the client should specify `Accept` as a forwarded header.
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
X-Bare-Headers: TODO
```

- Content-Encoding: The remote body's content encoding.
- Content-Encoding: The remote body's content length.
- X-Bare-Status: The status code of the remote.
- X-Bare-Status-Text: The status text of the remote.
- X-Bare-Headers: TODO

## Send and receive data from a remote

| Method | Endpoint   |
| -------- | -------------- |
| `*`    | /          |

Request Body:

Request Headers:

See [Bare Request Headers](#bare-request-headers)

Response Headers:

See [Bare Response Headers](#bare-response-headers)

Response Body:

The remote's response body will be sent as the response body.

## Create a WebSocket tunnel to a remote

| Method | Endpoint  |
| -------- | ------------- |
| `GET`  | /         |

Request Headers:

```
Upgrade: websocket
Sec-WebSocket-Protocol: bare-v3
```

Response Body:

TODO