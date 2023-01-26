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

/** The distance between {@link CHE_MIN_BYTE} and {@link CHE_MAX_BYTE} */
const CHE_BYTE_RANGE = CHE_MAX_BYTE - CHE_MIN_BYTE

/** The maximum header name length in Compact Header Encoding */
export const CHE_HEADER_NAME_LENGTH_MAX = CHE_BYTE_RANGE + 1

/** The maximum header ID in Compact Header Encoding */
export const CHE_HEADER_ID_MAX = (
    // We use base 95 math, but the first digit only ranges from 0 to 93 (not 94).
    // This is because we already reserve CHE_MIN_BYTE for actual name strings.
    (CHE_MAX_BYTE - (CHE_MIN_BYTE + 1)) * (CHE_BYTE_RANGE + 1) +
    // The second digit ranges from 0 to 94.
    (CHE_MAX_BYTE - CHE_MIN_BYTE)
)

/** The maximum header value length in the first/second length bytes in Compact Header Encoding */
const CHE_HEADER_VALUE_LENGTH_TAGGED_MAX = (CHE_BYTE_RANGE >> 1 & 0b1111_1110) | (CHE_BYTE_RANGE & 1)

/** The maximum header value length that fits within one byte in Compact Header Encoding */
const CHE_HEADER_VALUE_LENGTH_ONE_MAX = CHE_HEADER_VALUE_LENGTH_TAGGED_MAX

/** The maximum header value length that fits within two bytes in Compact Header Encoding */
const CHE_HEADER_VALUE_LENGTH_TWO_MAX = (
    // We can use this space more wisely by eliminating redundancy.
    (CHE_HEADER_VALUE_LENGTH_ONE_MAX + 1) +
    // This is essentially two-digit base 47 math, as each digit can range from 0 to 46.
    (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) + CHE_HEADER_VALUE_LENGTH_TAGGED_MAX)
)

/** The maximum header value length in Compact Header Encoding */
export const CHE_HEADER_VALUE_LENGTH_MAX = (
    (CHE_HEADER_VALUE_LENGTH_TWO_MAX + 1) +
    (
        // The first two digits range from 0 to 46.
        CHE_HEADER_VALUE_LENGTH_TAGGED_MAX * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) * (CHE_BYTE_RANGE + 1) +
        CHE_HEADER_VALUE_LENGTH_TAGGED_MAX * (CHE_BYTE_RANGE + 1) +
        // The third digit ranges from 0 to 94.
        CHE_BYTE_RANGE
    )
)

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
 * Decode the underlying value in a tagged value length byte in Compact Header Encoding
 * @param {number} byte
 * @return {number}
 */
function decodeTaggedValue(byte) {
    return (byte >> 1 & 0b1111_1110) | (byte & 1)
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
        const nameFirst = readByte(encoded, i++)
        const nameSecond = readByte(encoded, i++)
        let name

        if (nameFirst === CHE_MIN_BYTE) {
            // Name lengths range from 1 to 48, inclusive
            const nameLength = nameSecond - CHE_MIN_BYTE + 1
            const nameEnd = i + nameLength

            ok(nameEnd <= encoded.length, "End of header name exceeds the string length")
            name = encoded.slice(i, nameEnd)
            i = nameEnd
        } else {
            // IDs are base 95 numbers.
            // The first digit ranges from 0 to 93, not 94, since CHE_MIN_BYTE is already used above.
            // The second digit ranges from 0 to 94 as expected.
            name = (
                (nameFirst - (CHE_MIN_BYTE + 1)) * (CHE_BYTE_RANGE + 1) +
                (nameSecond - CHE_MIN_BYTE)
            )
        }

        const valueFirstByte = readByte(encoded, i++) - CHE_MIN_BYTE
        let valueLength
        if (valueFirstByte & 0b0000_0010) {
            const valueSecondByte = readByte(encoded, i++) - CHE_MIN_BYTE
            if (valueSecondByte & 0b0000_0010) {
                const valueThirdByte = readByte(encoded, i++) - CHE_MIN_BYTE
                valueLength = (
                    (CHE_HEADER_VALUE_LENGTH_TWO_MAX + 1) +
                    (
                        decodeTaggedValue(valueFirstByte) * ((CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) * (CHE_BYTE_RANGE + 1)) +
                        decodeTaggedValue(valueSecondByte) * (CHE_BYTE_RANGE + 1) +
                        valueThirdByte
                    )
                )
            } else {
                valueLength = (
                    (CHE_HEADER_VALUE_LENGTH_ONE_MAX + 1) +
                    (
                        decodeTaggedValue(valueFirstByte) * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) +
                        decodeTaggedValue(valueSecondByte)
                    )
                )
            }
        } else {
            valueLength = decodeTaggedValue(valueFirstByte)
        }
        const valueEnd = i + valueLength

        ok(valueEnd <= encoded.length, "End of header value exceeds the string length")
        const value = encoded.slice(i, valueEnd)
        i = valueEnd

        data.push([name, value])
    }

    return data
}

/**
 * Encode part of a header value length into a tagged byte for Compact Header Encoding
 * @param {number} value
 * @param {boolean} next
 * @return {number}
 */
function encodeTaggedValue(value, next) {
    return (value << 1 & 0b1111_1100) | (value & 1) | (next << 1)
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
                ok(name.length, "Header name must not be empty")
                ok(name.length <= CHE_HEADER_NAME_LENGTH_MAX, "Header name length exceeds maximum length")
                encoded += String.fromCharCode(CHE_MIN_BYTE, (CHE_MIN_BYTE - 1) + name.length)
                encoded += name
                break
            }
            case "number": {
                // The following code is a much simpler version of the upcoming value length calculations.
                ok(name <= CHE_HEADER_ID_MAX, "Header ID exceeds maximum ID")
                const nameFirstRaw = name / (CHE_BYTE_RANGE + 1) | 0
                const nameSecondRaw = name % (CHE_BYTE_RANGE + 1) | 0
                const nameFirst = (CHE_MIN_BYTE + 1) + nameFirstRaw
                const nameSecond = CHE_MIN_BYTE + nameSecondRaw
                encoded += String.fromCharCode(nameFirst, nameSecond)
                break
            }
            default: {
                fail("Header name is neither a string nor a number")
            }
        }

        ok(value.length <= CHE_HEADER_VALUE_LENGTH_MAX, "Header value length exceeds maximum length")

        /*
            The following code may seem messy, but it's mostly "place-value" calculations and flag-setting.

            For a visual example, to encode a number between 0 and 999 in base 10:
            The first digit equals the number modulo 10.
            The second digit equals the number divided by 10, modulo 10, and floored.
            The third digit equals the number divided by 100 and floored.

            The following code performs a similar task, but with three different cases:
            1 byte : xx        | val = xx
            2 bytes: xx yy     | val = xx * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) +
                               |       yy
            3 bytes: xx yy zz  | val = xx * (CHE_BYTE_RANGE + 1) * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) +
                               |       yy * (CHE_BYTE_RANGE + 1) +
                               |       zz

            Even now, there is further complexity!
            For the 2-byte and 3-byte cases, the maximum value of the previous case is added to the "actual value".
            This minor change eliminates redundancy and makes the best use of the extra bytes.

            The first two bytes are tagged using the second bit (starting from the LSB).
            In other words, the values of tagged bytes are shifted to the left by one, except for the LSB.
            All of these bytes then have CHE_MIN_BYTE added to them.
        */

        if (value.length > CHE_HEADER_VALUE_LENGTH_TWO_MAX) {
            const modifiedLength = value.length - (CHE_HEADER_VALUE_LENGTH_TWO_MAX + 1)
            const valueLengthFirstRaw = encodeTaggedValue(
                modifiedLength / ((CHE_BYTE_RANGE + 1) * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1)) | 0,
                true
            )
            const valueLengthSecondRaw = encodeTaggedValue(
                (modifiedLength / (CHE_BYTE_RANGE + 1) | 0) % (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1),
                true
            )
            const valueLengthThirdRaw = modifiedLength % (CHE_BYTE_RANGE + 1)
            const valueLengthFirst = CHE_MIN_BYTE + valueLengthFirstRaw
            const valueLengthSecond = CHE_MIN_BYTE + valueLengthSecondRaw
            const valueLengthThird = CHE_MIN_BYTE + valueLengthThirdRaw
            encoded += String.fromCharCode(valueLengthFirst, valueLengthSecond, valueLengthThird)
        } else if (value.length > CHE_HEADER_VALUE_LENGTH_ONE_MAX) {
            const modifiedLength = value.length - (CHE_HEADER_VALUE_LENGTH_ONE_MAX + 1)
            const valueLengthFirstRaw = encodeTaggedValue(
                modifiedLength / (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) | 0,
                true
            )
            const valueLengthSecondRaw = encodeTaggedValue(
                modifiedLength % (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1),
                false
            )
            const valueLengthFirst = CHE_MIN_BYTE + valueLengthFirstRaw
            const valueLengthSecond = CHE_MIN_BYTE + valueLengthSecondRaw
            encoded += String.fromCharCode(valueLengthFirst, valueLengthSecond)
        } else {
            const valueLengthFirstRaw = encodeTaggedValue(value.length, false)
            const valueLengthFirst = CHE_MIN_BYTE + valueLengthFirstRaw
            encoded += String.fromCharCode(valueLengthFirst)
        }

        encoded += value
    }

    return encoded
}
