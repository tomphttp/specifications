/**
 * @file Compact Header Encoding reference implemenation
 * @author CountBleck <Mr.YouKnowWhoIAm@protonmail.com>
 * @license
 * Copyright (c) 2022 CountBleck
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// SPDX-License-Identifier: MIT

import {ok, equal, fail} from "node:assert/strict"

/** @typedef {[name: string | number, value: string][]} HeaderData */

/** The minimum byte allowed in lengths and header IDs in Compact Header Encoding */
const CHE_MIN_BYTE = 0b0010_0000

/** The maximum byte allowed in lengths and header IDs in Compact Header Encoding */
const CHE_MAX_BYTE = 0b0111_1110

/** The maximum byte for header name lengths in Compact Header Encoding */
const CHE_HEADER_NAME_LENGTH_MAX_BYTE = 0b0100_1111

/**
 * The minimum byte for header IDs in Compact Header Encoding
 *
 * Equivalent to {@link CHE_HEADER_NAME_LENGTH_MAX_BYTE} + 1
 */
const CHE_HEADER_ID_MIN_BYTE = 0b0101_0000

/**
 * The number of values between {@link CHE_MIN_BYTE} and {@link CHE_MAX_BYTE}
 *
 * Used for calculating header value lengths
 */
const CHE_BYTE_RANGE = CHE_MAX_BYTE - CHE_MIN_BYTE + 1

/** The maximum header name length */
const CHE_HEADER_NAME_LENGTH_MAX = CHE_HEADER_ID_MIN_BYTE - CHE_MIN_BYTE

/** The maximum header ID */
const CHE_HEADER_ID_MAX = CHE_MAX_BYTE - CHE_HEADER_ID_MIN_BYTE

/** The maximum header value length */
const CHE_HEADER_VALUE_LENGTH_MAX = CHE_BYTE_RANGE ** 2 - 1

/**
 * Read a byte for lengths and header IDs and check if it lies within the allowed bounds for Compact Header Encoding
 * @param {string} encoded
 * @param {number} i
 * @return {number}
 */
function readByte(encoded, i) {
    const byte = encoded.charCodeAt(i)
    ok(byte >= CHE_MIN_BYTE, "Byte is less than the minimum allowed value")
    ok(byte <= CHE_MAX_BYTE, "Byte is greater than the maximum allowed value")
    return byte
}

/**
 * Decode a string encoded using Compact Header Encoding into a {@link HeaderData}
 * @param {string} encoded
 * @return {HeaderData}
 */
export function compactDecode(encoded) {
    ok(encoded.length >= 1, "Encoded string must contain at least one character")
    equal(encoded[0], ";", "Encoded string must begin with a semicolon")

    const data = []
    let i = 1
    while (i < encoded.length) {
        const nameInfo = readByte(encoded, i++)
        let name

        if (nameInfo <= CHE_HEADER_NAME_LENGTH_MAX_BYTE) {
            // Name lengths range from 1 to 48, inclusive
            const nameLength = nameInfo - CHE_MIN_BYTE + 1
            const nameEnd = i + nameLength

            ok(nameEnd <= encoded.length, "End of header name exceeds the string length")
            name = encoded.slice(i, nameEnd)
            i = nameEnd
        } else {
            // IDs range from 0 to 46, inclusive
            name = nameInfo - CHE_HEADER_ID_MIN_BYTE
        }

        // This calculation can be seen as a two-digit base CHE_BYTE_RANGE number
        // Note: header values can apparently be empty, hence the lack of a `+ 1`
        // Note: a Varint-like encoding could be used, but this approach is simpler
        const valueLengthLower = readByte(encoded, i++) - CHE_MIN_BYTE
        const valueLengthUpper = readByte(encoded, i++) - CHE_MIN_BYTE
        const valueLength = valueLengthUpper * CHE_BYTE_RANGE + valueLengthLower
        const valueEnd = i + valueLength

        ok(valueEnd <= encoded.length, "End of header value exceeds the string length")
        const value = encoded.slice(i, valueEnd)
        i = valueEnd

        data.push([name, value])
    }

    return data
}

/**
 * Encode a {@link HeaderData} into a string according to Compact Header Encoding
 * @param {HeaderData} data
 * @return {string}
 */
export function compactEncode(data) {
    let encoded = ";"
    for (const [name, value] of data) {
        switch (typeof name) {
            case "string": {
                ok(name.length <= CHE_HEADER_NAME_LENGTH_MAX, "Header name length exceeds maximum length")
                encoded += String.fromCharCode(CHE_MIN_BYTE + name.length - 1)
                encoded += name
                break
            }
            case "number": {
                ok(name <= CHE_HEADER_ID_MAX, "Header ID exceeds maximum ID")
                encoded += String.fromCharCode(CHE_HEADER_ID_MIN_BYTE + name)
                break
            }
            default: {
                fail("Header name is neither a string nor a number")
            }
        }

        ok(value.length <= CHE_HEADER_VALUE_LENGTH_MAX, "Header value length exceeds maximum length")

        const valueLengthLower = CHE_MIN_BYTE + (value.length % CHE_BYTE_RANGE    )
        const valueLengthUpper = CHE_MIN_BYTE + (value.length / CHE_BYTE_RANGE | 0)

        encoded += String.fromCharCode(valueLengthLower, valueLengthUpper)
        encoded += value
    }

    return encoded
}
