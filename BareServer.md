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
	"maintainer": {
		"email": "maintenance@example.org",
		"website": "https://projects.example.org/"
	},
	"project": {
		"name": "Project",
		"description": "Unique TOMP implementation",
		"email": "development@example.org",
		"website": "https://git.example.org/",
		"repository": "https://git.example.org/dev/project.git"
	}
}
```

A ? after the property indicates it's optional.

- maintainer {Object}?
	- email {String}?
	- website {String}?
- project {Object}?: The project's information.
	- name {String}?
	- description {String}?
	- email {String}?
	- website {String}?
	- repository {String}?: A link to the project's .git file.
- versions {Array{String}}: A list of version names this server supports. (resolvable to http://server/versionName/)
- language {String{JS,TS,Java,PHP,Rust,C,C++,C#,Ruby,Go,Crystal,Bash}}
- memoryUsage {Number}?: The memory used by the server.

In NodeJS, memoryUsage should be calculated by:

```js
Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100
```
