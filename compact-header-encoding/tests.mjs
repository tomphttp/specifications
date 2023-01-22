import {equal, deepEqual} from "node:assert/strict"
import {compactEncode, compactDecode} from "./index.mjs"

const ensureUnchanged = (data, trace = true) => {
    if (trace) console.log("Original:", data)

    const encoded = compactEncode(data)
    if (trace) console.log("Encoded:", encoded)

    const decoded = compactDecode(encoded)
    if (trace) console.log("Decoded:", decoded)

    deepEqual(decoded, data, "Decoded data differs")
}

ensureUnchanged([
    ["foo", "bar"],
    [42, "69"]
])

ensureUnchanged([
    ["Host", "example.org"],
    ["Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"]
])

ensureUnchanged([
    ["Content-Type", "text/html"],
])

let i = 0
let error
for (;;) {
    try {
        ensureUnchanged([["foo", "A".repeat(i)]], false)
    } catch (e) {
        error = e
        break
    }
    i++
}

equal(error.message, "Header value length exceeds maximum length", error)
equal(i, 212110 + 1, "Error was thrown on an unexpected header value length")

// TODO: More tests
