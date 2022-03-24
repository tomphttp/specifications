# Errors

Errors returned by the Bare Server are returned when the server cannot process the request or ran into an error.

Identifying errors:

- Not a 2xx/3xx status code
- `Content-Type: application/json`

## Format

```json
{
	"code": "UNKNOWN",
	"id": "request",
	"message": "The Bare Server encountered an unknown error relating to the request."
}
```

A ? after the property indicates it's optional.

- code {String}
- id {String}
- message {String}?
- stack {String}?: An optional stack trace.

## Error Codes

Error codes prefixed with `IMPL_` are not part of this specification. The implementer decides what the code represents.

- `UNKNOWN` {500}: The Bare Server could not identify the cause of the issue. This error is a fallback.
- `MISSING_BARE_HEADER` {400}: The request did not include a required bare header such as X-Bare-Host. `error.id` will contain the expected header.
- `INVALID_BARE_HEADER` {400}: A header such as X-Bare-Port contained an unparsable/invalid value.
- `FORBIDDEN_BARE_HEADER` {401}: A forbidden value such as `Host` in x-bare-pass-headers was specified.
- `UNKNOWN_BARE_HEADER` {400}: An unknown header beginning with `X-Bare-` was sent to the server.
- `FORBIDDEN_BARE_HEADER` {403}: A header such as X-Bare-Pass-Headers contained a forbidden value.
- `INVALID_HEADER` {400}: The Bare Server's HTTP implementation forbids a header value. `error.id` will contain the expected header.
- `HOST_NOT_FOUND` {500}: The DNS lookup for the host failed.
- `CONNECTION_RESET` {500}: The connection to the remote was closed before receving the response headers. This occurs after connecting to the socket or after sending the request headers.
- `CONNECTION_REFUSED` {500}: The connection to the remote was refused.
- `CONNECTION_TIMEOUT` {500}: The remote didn't respond with headers/body in time.

## Error IDs

Error IDs are in `<object>?.<key>` format.

### Objects

- `error`: A container for types such as Exception,TypeError,Error,SyntaxError
- `unknown` 
- `request`: The client's HTTP implementation.
- `request.headers`
- `request.body` {No key}
- `bare`: The Bare fields provided by the request headers.
- `bare.headers`
- `bare.forward_headers`
- `response`: The remote's HTTP implementation.
- `response.headers`
- `response.body` {No key}

### Keys

Keys are optional. The object could be `request.headers` and this will reference the headers, not any in specific. `request.headers.host` will refer to the host header.

### Example of keys

- `request.headers.x-bare-headers`
	- Object: `request.headers`
	- Key: `x-bare-headers`
- `bare.headers.x-custom_header`
	- Object: `bare.headers`
	- Key: `x-custom_header`
- `bare.headers.x-custom.header.a`
	- Object: `bare.headers`
	- Key: `x-custom.header.a`
