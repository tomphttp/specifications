# TOMPHTTP Specifications

## What is TOMP?

TOMP (acronym for Too Many Proxies) is an organization containing new standards and implementations for web proxies built on Service Workers.

## Why should I use the TOMP specifications?

Many proxies have been successful without following any specifications. Although the proxies may run very well, there is no unified backend or protocol. Prior to the TOMP model, if you wanted to set up 10 proxies, you needed to set up 10 servers. The TOMP model accomplishes a unified backend. In practice, you can have 10 implementations that use only one bare server, saving not only resources but the maintenance required for multiple servers.
 
Creating specifications allows for productivity. One developer can implement the TOMP model without having to write an entire backend, instead they can set up a Bare Server. This not only saves valuable time but allows the developer to focus more on the code they write, not HTTP/S frameworks or URL parsing libraries.

## Listing

[Bare Server](./BareServer.md)

[Proxy Model](./ProxyModel.md)

[WebSocket Protocol](./WebSocketProtocol.md)

## Planning

Although we take issues and pull requests, a lot of planning for new specifications happens in our [Discord server](https://discord.gg/6m9saxJQPh).

## List of implementations

https://github.com/tomphttp/implementations