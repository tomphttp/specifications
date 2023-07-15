# Bare Server V3 Endpoints

All endpoints are prefixed with `/v{version}/`

The endpoint `/` on v3 would be `/v3/`

This is an extension of [V2](./BareServerV2.md).

## Endpoints dropped from V2

- `/ws-new-meta`
- `/ws-meta`

## Header Lists

See [V2 Header Lists](./BareServerV2.md#header-lists)

## Split Headers

See [V2 Split Headers](./BareServerV2.md#split-headers)

## Forbidden Values

See [V2 Forbidden Values](./BareServerV2.md#forbidden-values)

## Base Values

All headers here are the base values. If a request specifies any of these headers, their value will add onto the base values (depending on if caching is enabled).

> Cache: If the query key `cache` is passed to any request endpoint, cache will be enabled. An effective query key value is a checksum of the protocol, host, port, and path. Any value is accepted.

- X-Bare-Pass-Headers:

  Value: none

  Value with caching: `last-modified`, `etag`, `cache-control`

- X-Bare-Forward-Headers:

  Headers dropped from V2: `sec-websocket-extensions`, `sec-websocket-key`, `sec-websocket-version`

  Value: `accept-encoding`, `accept-language`

  Value with caching: `accept-encoding`, `accept-language`, `if-modified-since`, `if-none-match`, `cache-control`

- X-Bare-Pass-Status:

  Value: none

  Value with caching: `304`

### Example

See [V2 Base Values Example](./BareServerV2.md#base-values-example)

## Bare Request Headers

Headers dropped from V2: X-Bare-Host, X-Bare-Port, X-Bare-Protocol, X-Bare-Path

These headers have been replaced with X-Bare-URL

Example:

```
X-Bare-URL: http://example.org/index.php
X-Bare-Headers: {"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"}
```

- X-Bare-URL: A URL to the destination in accordance with [RFC1738](https://www.rfc-editor.org/rfc/rfc1738). Only accepted protocols are: `http:` and `https:`.
- X-Bare-Headers: A JSON-serialized object containing the server request headers. Request header names may be capitalized. When making the request to the remote, capitalization is kept. Consider the header capitalization on `HTTP/1.0` and `HTTP/1.1`. Sites such as Discord check for header capitalization to make sure the client is a web browser. Headers correspond to this TypeScript type: `Record<string, string | string[]>`.
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
- Content-Length: The remote body's content length.
- X-Bare-Status: The status code of the remote.
- X-Bare-Status-Text: The status text of the remote.
- X-Bare-Headers: A JSON-serialized object containing remote response headers. Response headers may be capitalized if the remote sent any capitalized headers.

## Send and receive data from a remote

| Method | Endpoint |
| ------ | -------- |
| `*`    | /        |

Request Body:

Request Headers:

See [Bare Request Headers](#bare-request-headers)

Response Headers:

See [Bare Response Headers](#bare-response-headers)

Response Body:

The remote's response body will be sent as the response body.

## Create a WebSocket tunnel to a remote

| Method | Endpoint |
| ------ | -------- |
| `GET`  | /        |

Request Headers:

```
Upgrade: websocket
```

Response Body:

The response is a WebSocket. The server will accept the WebSocket and begin doing a handshake.

A handshake will look like this:

1. The client will inform the server of the destination it wants to connect to and provide request headers and headers to forward.

   ```json
   {
     "type": "connect",
     "remote": "ws://localhost:8000/ws",
     "protocols": [],
     "headers": {
       "Origin": "http://localhost:8000",
       "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
       "Host": "localhost:8000",
       "Pragma": "no-cache",
       "Cache-Control": "no-cache",
       "Upgrade": "websocket",
       "Connection": "Upgrade"
     },
     "forwardHeaders": []
   }
   ```

   This message must be sent as a text frame, not binary data. Any other type of WebSocket frame is considered invalid and the server should terminate the connection.

   - `type`: The type of message. Only accepted value is `"connect"`.
   - `remote`: A WebSocket URL to the destination in accordance with [RFC1738](https://www.rfc-editor.org/rfc/rfc1738). Only accepted protocols are: `ws:` and `wss:`
   - `protocols`: A string array of all the protocols that the client supports.
   - `headers`: An object containing the server request headers. See X-Bare-Headers in [Bare Request Headers](#bare-request-headers).
   - `forwardHeaders`: A string array containing all the headers to forward from the request to the remote. See X-Bare-Forward-Headers in [Bare Request Headers](#bare-request-headers).

   > If this message is not received after an amount of time (determined by the implementation), the connection may be terminated by the server.

   > The server must terminate the connection if this message contains invalid JSON/is invalid (eg. type isn't "connect" or the types don't validate)

2. The server will establish a connection to the remote based on the values sent by the client in #1.

3. Once established, the server will send a message to the client informing it that it's now open.

   ```json
   {
     "type": "open",
     "protocol": "",
     "setCookies": []
   }
   ```

   - `type`: The type of message. Only accepted value is `"open"`.
   - `protocol`: The accepted protocol.
   - `setCookies`: A string array containing all the `set-cookie` headers sent by the remote. If there's no headers, this array is empty. If there's one, this array has one element. If there's multiple, this array has multiple elements.

4. **Pipe mode**

   Once the server has sent the "open" message to the client, it will begin forwarding messages from the destination back to the client. No acknowledgement is required because the server should be sending messages in order until it's at this stage.

   Closing:

   - When the destination WebSocket is closed, the server will close the client WebSocket. Close codes are ignored.
   - When the client WebSocket is closed, the server will close the destination WebSocket. Close codes are ignored.

   Messages:

   Message types must be preserved. If text is sent to the server, text will be sent to the client. If binary data is sent to the server, binary data will be sent to the client. Visa versa.

   - When the destination WebSocket sends a message to the server, the server will send the message to the client.
   - When the client WebSocket sends a message to the server, the server will send the message to the destination.
