# Wisp over WebTransport

[Implementation](https://github.com/Fracital/holyWisp) (holyWisp 0.5.4, `src/quic/webtransport.c`, `src/server/conn.c`)

This is a transport for the [Wisp protocol](https://github.com/MercuryWorkshop/wisp-protocol) that runs over UDP. A browser opens `new WebTransport(url)` to the Wisp server, and Wisp packets travel over the WebTransport session instead of a WebSocket. The packets, their meaning and Wisp's flow control are unchanged. Two things change:

- Wisp streams no longer share one TCP connection, so a lost packet does not stall every stream behind it.
- DATA for a Wisp UDP stream can travel as a QUIC datagram. A lost datagram is lost, as it would be on a UDP socket, and nothing waits for it to be retransmitted.

The session is HTTP/3 over QUIC ([RFC 9000](https://www.rfc-editor.org/rfc/rfc9000), [RFC 9114](https://www.rfc-editor.org/rfc/rfc9114)) with WebTransport as Chrome implements it, [draft-ietf-webtrans-http3-02](https://datatracker.ietf.org/doc/html/draft-ietf-webtrans-http3-02). The byte values below are what Chrome 152 to 157 send.

A client that does not use the two extensions at the end of this document ([server-opened stream](#extension-server-opened-wisp-stream) and [lanes](#extension-lanes)) sees only the sections before them.

## Terms

| Term | Meaning |
| --- | --- |
| Session | One WebTransport session, made by one HTTP/3 CONNECT request. A QUIC connection carries one session. |
| Session ID | The QUIC stream ID of the CONNECT request. It is 0 for the first request on a connection. |
| Wisp stream | The bidirectional QUIC stream of the session that carries Wisp packets. Not to be confused with a Wisp stream ID inside a packet. |
| Varint | A QUIC variable-length integer ([RFC 9000 section 16](https://www.rfc-editor.org/rfc/rfc9000#section-16)). |

## QUIC and HTTP/3

The QUIC connection uses ALPN `h3`. Both ends offer the `max_datagram_frame_size` transport parameter ([RFC 9221 section 3](https://www.rfc-editor.org/rfc/rfc9221#section-3)); without it there are no datagrams. holyWisp offers 65535.

The server's HTTP/3 control stream opens with SETTINGS. holyWisp sends:

| Setting | ID | Value |
| --- | --- | --- |
| `SETTINGS_QPACK_MAX_TABLE_CAPACITY` | `0x01` | 0 |
| `SETTINGS_QPACK_BLOCKED_STREAMS` | `0x07` | 0 |
| `SETTINGS_ENABLE_CONNECT_PROTOCOL` | `0x08` | 1 |
| `SETTINGS_H3_DATAGRAM` | `0x33` | 1 |
| `SETTINGS_ENABLE_WEBTRANSPORT` | `0x2b603742` | 1 |
| `SETTINGS_WEBTRANSPORT_MAX_SESSIONS` | `0xc671706a` | 1 |

Chrome sends no request unless `SETTINGS_H3_DATAGRAM` and `SETTINGS_ENABLE_WEBTRANSPORT` are both 1. With a QPACK table capacity of 0, the request's headers use only the static table and literals, so a server needs no dynamic table.

## Opening the session

The client sends one request on a bidirectional stream:

```
:method: CONNECT
:protocol: webtransport
:scheme: https
:authority: relay.example:443
:path: /
origin: https://page.example
sec-webtransport-http3-draft02: 1
wt-available-protocols: "wisp-v2"
```

`wt-available-protocols` is optional. It is a structured field list of strings ([RFC 8941](https://www.rfc-editor.org/rfc/rfc8941)).

A server that accepts answers:

```
:status: 200
sec-webtransport-http3-draft: draft02
wt-protocol: "wisp-v2"
```

`wt-protocol` is sent only when the request had `wt-available-protocols`.

A server that refuses answers with the status a WebSocket upgrade would get, then closes the QUIC connection once the answer is acknowledged:

| Status | Reason |
| --- | --- |
| 403 | The `origin` is not allowed, or the client's address is blocked |
| 404 | The server does not accept sessions on this `:path` or `:authority` |
| 405 | The CONNECT's `:protocol` is not `webtransport` |
| 421 | The request is not a CONNECT (sent with `alt-svc: clear`, so a browser that reached this port through a cached alternative service goes back to TCP) |
| 426 | A v1 session on a server that requires a password |
| 429 | Too many connections from the client's address, or a second session on one QUIC connection |
| 503 | The server is full |

The client's address is the UDP source address. There is no proxy in front of a UDP listener, so a server reads no forwarding header (`X-Forwarded-For` and the like) here.

## Wisp version

The rule is the WebSocket rule: the session is Wisp v2 when the request carried `wt-available-protocols` at all (with any value) and the server speaks v2. Otherwise it is v1. The server's `wt-protocol` repeats the first token the client offered, as a WebSocket server repeats `Sec-WebSocket-Protocol`. The one exception is the token `wisp-v2-server-stream`, described [below](#extension-server-opened-wisp-stream).

## The Wisp stream

The client opens one bidirectional QUIC stream. It starts with the WebTransport stream header, then carries Wisp packets back to back, each preceded by its length:

```
Varint 0x41        (stream type: WebTransport bidirectional stream)
Varint session ID
then, repeated:
  u32 LE  length of the packet
  bytes   the Wisp packet
```

The length prefix is the framing epoxy-server's `LengthDelimitedLe` codec uses. A packet on this stream is exactly what one WebSocket binary message would carry.

Every Wisp packet that must arrive, and arrive in order, travels here: CONNECT, CLOSE, CONTINUE, INFO, and DATA for TCP streams.

A length counts the Wisp header (5 bytes) and the payload. A length larger than the receiver accepts is a framing error that leaves nothing to resynchronise on, so the receiver closes the QUIC connection with `H3_MESSAGE_ERROR` (`0x10e`). holyWisp accepts what its `max-message-size` allows: 1048581 bytes by default, a 1 MiB payload and its header.

### Other streams

The first bidirectional stream the client opens on the session is the Wisp stream. The server refuses these others with STOP_SENDING and RESET_STREAM:

| Stream | Code |
| --- | --- |
| A WebTransport unidirectional stream (type `0x54`) | `WEBTRANSPORT_BUFFERED_STREAM_REJECTED` (`0x3994bd84`) |
| A bidirectional stream for a session ID that is not this session's, or opened before the session is | `WEBTRANSPORT_BUFFERED_STREAM_REJECTED` |
| A further bidirectional stream on the session whose first packet is not LANE | `STREAM_UNWANTED`, see [lanes](#extension-lanes) |
| A further bidirectional stream whose LANE the server did not offer | `LANE_REFUSED`, see [lanes](#extension-lanes) |

So a client that does not use lanes opens exactly one bidirectional stream.

### The opening

The server sends nothing on the Wisp stream before the client opens it. Once the stream's header has arrived:

- A v1 server sends `CONTINUE` on Wisp stream 0 with its buffer size, as it does after a WebSocket's 101.
- A v2 server sends its `INFO`. The stream-0 `CONTINUE` follows once the server has handled the client's `INFO`, and until then the server acts on nothing but `INFO` and `CLOSE` on stream 0. (The [server-opened stream](#extension-server-opened-wisp-stream) saves this round trip.)

### Example

The first bytes of a v1 session. The client opens the Wisp stream and asks for a TCP connection to `example.com:80` on Wisp stream 1:

```
40 41                       stream type 0x41 (two-byte varint)
00                          session ID 0
13 00 00 00                 length 19
01 01 00 00 00 01 50 00     CONNECT, stream 1, TCP, port 80
65 78 61 6d 70 6c 65 2e
63 6f 6d                    "example.com"
```

The server's first bytes on the same stream, a CONTINUE for stream 0 with a buffer of 128 packets:

```
09 00 00 00                 length 9
03 00 00 00 00 80 00 00 00  CONTINUE, stream 0, 128
```

## Datagrams

A Wisp DATA packet for a **UDP** Wisp stream may be sent as one QUIC datagram ([RFC 9221](https://www.rfc-editor.org/rfc/rfc9221)) on the session, in either direction:

```
Varint  session ID / 4      (the quarter stream ID, RFC 9297)
bytes   the Wisp packet, whole, with no length prefix
```

Example: DATA `hi` for UDP Wisp stream 3 on session 0:

```
00 02 03 00 00 00 68 69
```

Rules:

- Only DATA for a UDP Wisp stream is ever sent as a datagram. A packet that must not be lost or reordered (CONNECT, CLOSE, CONTINUE, INFO, DATA for a TCP stream) never is.
- A sender uses a datagram only when the whole packet fits in one. A UDP DATA packet too large for a datagram goes on the Wisp stream instead, framed as above. holyWisp's QUIC packets are at most 1452 bytes (1200 until the path has been probed), so a Wisp packet in a datagram has somewhat less room than that.
- A receiver acts on a datagram only when it holds DATA for an open UDP stream, after the opening. holyWisp drops any other datagram, and counts the ones that held some other Wisp packet.
- A datagram that does not start with a valid quarter stream ID closes the QUIC connection with `H3_DATAGRAM_ERROR` (`0x33`). One for another session ID is dropped.
- While a holyWisp server is not reading from the client (its queues toward the remotes are full), it drops the client's datagrams instead of holding them, as a full UDP socket buffer does.
- A datagram can be lost, duplicated or reordered. So can the datagrams of a UDP socket, and the programs behind a Wisp UDP stream (QUIC, WebRTC, DNS) already cope with that.

## Flow control

Wisp's flow control is unchanged: `CONTINUE` per TCP stream, counted in packets, and none for UDP streams. QUIC's own flow control works underneath it. A holyWisp server that wants the client to stop sending stops granting QUIC credit, which is what not reading a TCP socket does on a WebSocket.

## Closing

- Either side ends the session with the `CLOSE_WEBTRANSPORT_SESSION` capsule on the CONNECT stream, then a FIN on that stream. The layout is below.
- When the server ends a session after a CLOSE on Wisp stream 0, the capsule's code is that CLOSE's reason and its message is the reason's name (`0x04` "incompatible extensions", `0xc0` for a wrong password, and so on). Where a WebSocket server would have closed with 1001 (a drain reached its deadline, or the connection sat idle past the server's timeout), the capsule carries 1001 with an empty message. A server that stops sends code 0 with the message "server stopping". Otherwise the code is 0.
- The server sends its capsule only once what it sent before is acknowledged. Chrome drops the data a stream holds unread once the capsule arrives, so a CLOSE sent in the same flight as the capsule would never reach the page.
- The end of the Wisp stream (FIN or reset), from either side, ends the session, as the end of a WebSocket does.
- Chrome sends no QUIC CONNECTION_CLOSE after a session ends, and goes silent. holyWisp closes the QUIC connection itself once the session is over.

The capsule ([RFC 9297 section 3.2](https://www.rfc-editor.org/rfc/rfc9297#section-3.2)) goes inside an HTTP/3 DATA frame on the CONNECT stream:

```
Varint  0x00          (HTTP/3 frame type: DATA)
Varint  frame length
Varint  0x2843        (capsule type: CLOSE_WEBTRANSPORT_SESSION)
Varint  capsule length
u32 BE  application error code
bytes   message, UTF-8, at most 1024 bytes
```

The error code is big-endian, as everywhere in HTTP/3, unlike the little-endian fields inside Wisp packets.

Example: the server ends the session after `CLOSE(0, 0x04)`:

```
00 1e                       DATA frame, length 30
68 43                       capsule type 0x2843 (two-byte varint)
1b                          capsule length 27
00 00 00 04                 code 4
69 6e 63 6f 6d 70 61 74
69 62 6c 65 20 65 78 74
65 6e 73 69 6f 6e 73        "incompatible extensions"
```

## Certificates

A page that connects to a server without a certificate from the Web PKI passes the certificate's hash in `serverCertificateHashes`. Chrome accepts such a certificate only if it is X.509 v3 with an ECDSA P-256 key and valid for at most 14 days.

holyWisp makes its own certificate by default (valid for 13 days, renewed every 6) and publishes the hashes on its TCP port. `GET /webtransport.json` answers with `Access-Control-Allow-Origin: *` and `Cache-Control: no-store`:

```json
{
  "url": "",
  "hashes": [
    { "algorithm": "sha-256", "value": "<base64 SHA-256 of the current certificate>" },
    { "algorithm": "sha-256", "value": "<base64 SHA-256 of the previous one>" }
  ]
}
```

- `url` is the WebTransport URL to use, or empty when the page derives it from the server's origin.
- `hashes` lists the current and the previous certificate, so a page that read the file just before a renewal still connects.
- A server with a certificate from the Web PKI lists no hashes.

A page uses it like this:

```js
const info = await (await fetch("https://relay.example/webtransport.json")).json();
const transport = new WebTransport(info.url || "https://relay.example/", {
	serverCertificateHashes: info.hashes.map((h) => ({
		algorithm: h.algorithm,
		value: Uint8Array.from(atob(h.value), (c) => c.charCodeAt(0)),
	})),
	protocols: ["wisp-v2"],
});
await transport.ready;
```

## Extension: server-opened Wisp stream

Without it, a v2 client waits a round trip after `ready` for the server's `INFO`. With it, the server opens the Wisp stream itself and writes its opening in the same flight as the 200.

- A v2 client offers both tokens, the plain one first: `wt-available-protocols: "wisp-v2", "wisp-v2-server-stream"`.
- A server that supports the extension answers `wt-protocol: "wisp-v2-server-stream"`, whether or not it offers lanes. It then opens a bidirectional stream right behind the 200 (with the same `0x41` header) and writes its `INFO` on it. When the server requires no password, the stream-0 `CONTINUE` follows at once, so the client can send its first CONNECT as soon as it has read them.
- The client's first packet on that stream must be its `INFO`. Anything else is answered with `CLOSE` on stream 0, reason `0x04`, and the session ends.
- A server without the extension answers `wt-protocol: "wisp-v2"`, and the client opens the Wisp stream as usual.
- Once the server has opened the Wisp stream, every bidirectional stream the client opens must be a [lane](#extension-lanes). The server resets any other with `STREAM_UNWANTED`.

## Extension: lanes

One QUIC stream holds up everything on it when one of its packets is lost, and Chrome gives each stream a fixed receive window. Lanes spread the Wisp streams of a session over several bidirectional QUIC streams. The Wisp stream is lane 0. This extension and the one above come from STomp's `wisp-lanes` draft 2.

### Offer

A v2 server that takes lanes puts extension `0xE1` in its `INFO`, with one byte of metadata: the most lanes a session may have, lane 0 included. holyWisp offers 8 by default and at most 16.

### LANE packet

After the stream-0 `CONTINUE`, the client may open more bidirectional streams. Each starts with the WebTransport stream header and then, as its first framed packet, a LANE packet:

```
u8      0xE1 (type)
u32 LE  0 (Wisp stream ID)
u8      lane index, 1 to (lanes - 1)
```

Example, opening lane 2 on session 0:

```
40 41 00                    stream header
06 00 00 00                 length 6
e1 00 00 00 00 02           LANE, index 2
```

After the LANE packet, a lane carries framed Wisp packets exactly as lane 0 does.

### Rules

- Each index may be opened once. A LANE the server did not offer, out of range or repeated is reset with `LANE_REFUSED`. A stream whose first packet is not LANE is reset with `STREAM_UNWANTED`.
- A Wisp stream belongs to the lane its CONNECT arrived on, for its whole life. Everything the server sends for it goes on that lane: DATA, CONTINUE, CLOSE, and the CLOSE that refuses the CONNECT. Wisp stream 0 belongs to lane 0. UDP DATA still goes as a datagram when it fits.
- A lane never moves a Wisp stream, so the order of one Wisp stream's packets is its lane's order. One Wisp stream still rides one lane.
- The server acts on nothing from a lane before the handshake is done. It holds those bytes without granting QUIC credit for them, and it drops nothing.
- The end of any lane (FIN, RESET_STREAM or STOP_SENDING) ends the session.
- The client chooses the lane for each CONNECT, and the server accepts any open lane. holyWisp's client takes the lane with the fewest open streams, the lowest index of those.

### Error codes

The application error codes are WebTransport's, mapped into HTTP/3's range as the draft specifies: `0x52e4a40fa8db + code + floor(code / 0x1e)`.

| Name | Code | On the wire |
| --- | --- | --- |
| `LANE_REFUSED` | `0x01` | `0x52e4a40fa8dc` |
| `STREAM_UNWANTED` | `0x02` | `0x52e4a40fa8dd` |

## Security notes for servers

- Charge nothing to a client's address before QUIC has validated it (a completed handshake, or a Retry token returned). The source address of a UDP datagram can be forged.
- Answer a datagram with Version Negotiation or Retry only when it is at least 1200 bytes, and keep a stateless reset shorter than what it answers, so the listener cannot be used to amplify traffic.
- Apply the same egress policy, limits and reputation as the WebSocket listener, at the same points: the connection-level checks when the CONNECT arrives, and the per-destination checks around each dial.
- Make the idle timeout mandatory. holyWisp's default is 30 s, with a keepalive after 20 s without sending, because many NATs forget a UDP flow after 30 s.
