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


## Error Codes

- `UNKNOWN`: The Bare Server could not identify the cause of the issue. This error is a fallback.
- `MISSING_HEADER`: The request did not include a required header. `error.id` will contain the expected header.
- `INVALID_HEADER`: The Bare Server's HTTP implementation forbids a header value. `error.id` will contain the expected header.
- `HOST_NOT_FOUND`: The DNS lookup for the host failed.
- `CONNECTION_RESET`: The connection to the remote was closed before receving the response headers. This occurs after connecting to the socket or after sending the request headers.
- `CONNECTION_REFUSED`: The connection to the remote was refused.
- `CONNECTION_TIMEOUT`: The remote didn't respond with headers/body in time.

## Error IDs

Error IDs are in `<object>?.<key>` format.

### Objects

- `request`: The client's HTTP implementation.
- `request.headers`
- `request.body` {No key}
- `response`: The remote's HTTP implementation.
- `response.headers`
- `response.body` {No key}

### Keys

Keys are optional. The object could be `request.headers` and this will reference the headers, not any in specific. `request.headers.host` will refer to the host header.
