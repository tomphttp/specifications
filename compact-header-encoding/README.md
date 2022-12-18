# Compact Header Encoding

Compact Header Encoding (CHE) is a format for a list of header name-value pairs designed to be more compact than JSON, hence the name.
The format is designed somewhat like a binary format, but numbers are represented using characters between 0x20 (space) to 0x7E (tilde).
These constraints allow CHE to work well in HTTP headers.

# Specification

TODO

# Reference Implementation
The reference implementation is located at [reference implementation](./index.js).