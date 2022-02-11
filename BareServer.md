# Bare Server

- [Implementation](https://github.com/tomphttp/bare-server-node/blob/master/Server.mjs)

The TompHTTP Bare Server is a server that will receive requests from a service worker (or any client) and forward a request to the specified URL.

Bare Servers can run on directories. For example, if the directory was `/bare/` then the bare origin would look like `http://example.org/bare/`. The bare origin is passed to clients.

- [V1 Endpoints](./BareServerV1.md)

## Request server info

| Method | Endpoint  |
| ------ | --------- |
| `GET`  | /         |

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
	"requestReceived": 1643596566477,
	"maintainer": {
		"email": "maintenance@example.org",
		"website": "https://projects.example.org/"
	},
	"developer": {
		"name": "Project",
		"description": "Unique TOMP implementation",
		"email": "development@example.org",
		"website": "https://git.example.org/",
		"repository": "https://git.example.org/dev/project.git"
	}
}
```

- body.maintainer: An optional property containing the maintainer's information. This should be changable by the maintainer.
- body.maintainer.email: An optional property containing the maintainer's email address.
- body.maintainer.website: An optional property containing a link to the maintainer's website.
- body.developer.name: An optional property containing the project's name.
- body.developer.description: An optional property containing the project's description.
- body.developer.email: An optional property containing the developers's email address.
- body.developer.website: An optional property containing a link to the developer's website.
- body.developer.repository: An optional property linking to the project's git file.
- body.versions: An array of Bare Server versions the server supports.
- body.language: The language the bare server is written in. This can be: JS,TS,Java,PHP,Rust,C,C++,C#,Ruby,Go,Crystal,Bash
- body.memoryUsage: The memory used by the bare server. This is used to rank servers.
In NodeJS, this value should be calculated by:
```js
Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
```
- body.requestReceived: The time the request to this endpoint was recieved in milliseconds as an integer. This is to check latency.
