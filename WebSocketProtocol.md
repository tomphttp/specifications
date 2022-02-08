# WebSocket Protocol Encoding

[Implementation](https://github.com/tomphttp/specifications/blob/master/EncodeProtocol.mjs)

This encoding is similar to URIComponent encoding.

The `Sec-WebSocket-Protocol` header contains protocols. Protocol values have a [character set](#websocket-protocol-characters). In cases when TompHTTP requires characters outside this range in protocols, this encoding is used.

## Encoding

Each character in a string is checked if its in the [character set](#websocket-protocol-characters) or a [reserved character](#reserved-characters).

If this condition is met, the character is replaced with an escaped value. An escaped value is a percent symbol (`0x37`, ASCII) followed by the characters hexadecimal code. For example: the string `1/100%` would become `1%2F100%25`.

## Decoding

Each character in a string is iterated over. If the character begins with `%` then it is assumed the next 2 characters will be a hexadecimal code. The hexadecimal will be read then the `%` symbol and the next 2 characters will be replaced with the character belonging to the hexadecimal code.

## Reserved Characters

`%`

## WebSocket Protocol Characters

```
!#$%&'*+-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz|~
```

ASCII characters. 77 Total.
