# Bare Server

The TompHTTP Bare Server is a server that will receive requests from a service worker (or any client) and forward a request to the specified URL.

Bare Servers can run on directories. For example, if the directory was `/bare/` then the bare origin would look like `http://example.org/bare/`. The bare origin is passed to clients.

## Endpoints

- [V1 Endpoints](./BareServerV1.md)

| Method | Endpoint  |
| - | - |
| `GET` | / |

This endpoint is not subject to change. It will remain the same across versions.

Response Headers:

```
Content-Type: application/json
```

Response Body:

```json
{
	"versions": [
		"v1"
	],
	"language": "NodeJS",
	"memoryUsage": 1.04,
	"requestReceived": 1643596566477
}
```

body.versions: An array of Bare Server versions the server supports.

body.language: The language the bare server is written in. This can be: JS,TS,Java,PHP,Rust,C,C++,C#,Ruby,Go,Crystal,Bash

body.memoryUsage: The memory used by the bare server. This is used to rank servers.
In NodeJS, this value should be calculated by:
```js
Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
```

body.requestReceived: The time the request to this endpoint was recieved in milliseconds as an integer. This is to check latency.
