import {deepEqual} from "node:assert/strict"
import {compactEncode, compactDecode} from "./index.js"

const ensureUnchanged = data => {
    console.log("Original:", data)
    const encoded = compactEncode(data)
    console.log("Encoded:", encoded)
    const decoded = compactDecode(encoded)
    console.log("Decoded:", decoded)
    deepEqual(decoded, data, "Decoded data differs")
}

ensureUnchanged([
    ["foo", "bar"],
    [42, "69"]
])

// TODO: More tests