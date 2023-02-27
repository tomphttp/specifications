# Compact Header Encoding

Compact Header Encoding (CHE) is a format for a list of header name-value pairs designed to be more compact than JSON, hence the name.
The format is designed somewhat like a binary format, but numbers are represented using characters between 0x20 (space) to 0x7E (tilde).
These constraints allow CHE to work well in HTTP headers.

# Specification/Documentation

## Constants
### Fixed
* `CHE_MIN_BYTE`
  * **is equal to `0b0010_0000` (decimal 32)**
  * is the first visible/"normal" ASCII character: space
* `CHE_MAX_BYTE`
  * **is equal to `0b0111_1110` (decimal 126)**
  * is the last visible/"normal" ASCII character: tilde
  * The next and last ASCII character is the delete character, which CHE refrains from using.
### Calculated
* `CHE_BYTE_RANGE`
  * **is equal to `CHE_MAX_BYTE - CHE_MIN_BYTE`**
  * is equivalent to the distance between the first and last characters
  * is used as the maximum value a given byte in CHE can hold
* `CHE_HEADER_NAME_LENGTH_MAX`
  * **is equal to `CHE_BYTE_RANGE + 1`**
  * is used as the maximum header name length when names are provided as strings
  * The minimum header name length is 1.
* `CHE_HEADER_ID_MAX`
  * **is equal to `(CHE_MAX_BYTE - (CHE_MIN_BYTE + 1)) * (CHE_BYTE_RANGE + 1) + (CHE_MAX_BYTE - CHE_MIN_BYTE)`**
  * is based upon the maximum two-digit base 95 number, where the first digit can only range from 0 to 93
* `CHE_HEADER_VALUE_LENGTH_TAGGED_MAX`
  * **is equal to `(CHE_BYTE_RANGE >> 1 & 0b1111_1110) | (CHE_BYTE_RANGE & 1)`**
  * is the largest value contained within a tagged value length byte
* `CHE_HEADER_VALUE_LENGTH_ONE_MAX`
  * **is equal to `CHE_HEADER_VALUE_LENGTH_TAGGED_MAX`**
  * is the maximum length contained within a single value length byte
* `CHE_HEADER_VALUE_LENGTH_TWO_MAX`
  * **is equal to `(CHE_HEADER_VALUE_LENGTH_ONE_MAX + 1) + ((CHE_HEADER_VALUE_LENGTH_TAGGED_MAX * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) + CHE_HEADER_VALUE_LENGTH_TAGGED_MAX)`**
  * is the maximum length contained within two value length bytes
  * is based upon the maximum two-digit base 47 number, plus the sum of the single length byte's maximum and 1, in order to avoid redundancy
* `CHE_HEADER_VALUE_LENGTH_MAX`
  * **is equal to `(CHE_HEADER_VALUE_LENGTH_TWO_MAX + 1) + (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX * (CHE_HEADER_VALUE_LENGTH_TAGGED_MAX + 1) * (CHE_BYTE_RANGE + 1) + CHE_HEADER_VALUE_LENGTH_TAGGED_MAX * (CHE_BYTE_RANGE + 1) + CHE_BYTE_RANGE)`**
  * is the maximum length contained within all three value length bytes
  * is based on a three-digit number where the last digit ranges from 0 to 94 (base 95) while the first two range from 0 to 46 (base 47), plus the sum of the maximum contained in two length bytes plus 1, in order to avoid redundancy

## Functions
The italicized functions are exported; they are intended to be used by outside code.
Unitalicized functions should not be made available to outside code.

### `ReadByte(encoded: string, i: u32): u8`: read a byte from a string and assert it lies between `CHE_MIN_BYTE` and `CHE_MAX_BYTE`
1. Let `byte` be the `i`th byte of `encoded`.
1. Assert `byte` is less than or equal to `CHE_MIN_BYTE`.
1. Assert `byte` is greater than or equal to `CHE_MAX_BYTE`.
1. Return `byte`.
### `DecodeTaggedValue(byte: u8): u8`: extract the value of a tagged value length byte
1. Let `upper` be the result of logically bit-shifting `byte` to the right by one bit.
1. Clear the least significant bit of `upper`.
1. Let `lower` be the least significant bit of `byte`.
1. Let `value` be the result of a bitwise OR between `upper` and `lower`.
1. Return `value`.
### *`CompactDecode(encoded: string): [name: string | u16, value: string][]`: decode a CHE-encoded string into its original header array*
1. Assert `encoded` is not empty.
1. Assert the first character of `encoded` is equal to the semicolon character (";").
1. Let `data` be an empty array of tuples of the type `[name: string | u16, value: string]`.
1. Let `index` be one.
1. Repeat, while `index` is less than the length of `encoded`:
   1. Let `nameFirstByteRaw` be the result of `ReadByte(encoded, index)`.
   1. Increment `index`.
   1. Let `nameSecondByteRaw` be the result of `ReadByte(encoded, index)`.
   1. Increment `index`.
   1. If `nameFirstByteRaw` equals `CHE_MIN_BYTE`:
      1. Let `nameLength` be `nameSecondByteRaw` minus `CHE_MIN_BYTE`, plus one.
      1. Let `nameEnd` be the sum of `index` and `nameLength`.
      1. Assert `nameEnd` is less than or equal to the length of `encoded`.
      1. Let `name` be the substring of `encoded` starting at `index` and ending before `nameEnd`.
      1. Set `index` to be `nameEnd`.
   1. Else:
      1. Let `nameFirstDigit` be `nameFirstByteRaw` minus `CHE_MIN_BYTE`, minus one.
      1. Let `nameSecondDigit` be `nameSecondByteRaw` minus `CHE_MIN_BYTE`.
      1. Let `nameFirstCoefficient` be the sum of `CHE_BYTE_RANGE` and one.
      1. Let `nameSecondCoefficient` be equal to one.
      1. Let `nameFirstDigitPlaceValue` be the product of `nameFirstDigit` and `nameFirstCoefficient`.
      1. Let `nameSecondDigitPlaceValue` be the product of `nameSecondDigit` and `nameSecondCoefficient`.
      1. Let `name` be the sum of `nameFirstDigitPlaceValue` and `nameSecondDigitPlaceValue`.
   1. Let `valueFirstByte` be the result of `ReadByte(encoded, index)` minus `CHE_MIN_BYTE`.
   1. Increment `index`.
   1. If `valueFirstByte` has its second least significant bit set:
      1. Let `valueSecondByte` be the result of `ReadByte(encoded, index)` minus `CHE_MIN_BYTE`.
      1. Increment `index`.
      1. If `valueSecondByte` has its second least significant bit set:
         1. Let `valueThirdByte` be the result of `ReadByte(encoded, index)` minus `CHE_MIN_BYTE`.
         1. Increment `index`.
         1. Let `valueZero` be the sum of `CHE_HEADER_VALUE_LENGTH_TWO_MAX` and one.
         1. Let `valueFirstDigit` be the result of `DecodeTaggedValue(valueFirstByte)`.
         1. Let `valueSecondDigit` be the result of `DecodeTaggedValue(valueSecondDigit)`.
         1. Let `valueThirdDigit` be equal to `valueThirdByte`.
         1. Let `valueFirstCoefficient` be the product of `CHE_HEADER_VALUE_LENGTH_TAGGED_MAX` plus one, and `CHE_BYTE_RANGE` plus one.
         1. Let `valueSecondCoefficient` be the sum of `CHE_BYTE_RANGE` and one.
         1. Let `valueThirdCoefficient` be equal to one.
         1. Let `valueFirstDigitPlaceValue` be the product of `valueFirstDigit` and `valueFirstCoefficient`.
         1. Let `valueSecondDigitPlaceValue` be the product of `valueSecondDigit` and `valueSecondCoefficient`.
         1. Let `valueThirdDigitPlaceValue` be the product of `valueThirdDigit` and `valueThirdCoefficient`.
         1. Let `valueLength` be the sum of `valueZero`, `valueFirstDigitPlaceValue`, `valueSecondDigitPlaceValue`, and `valueThirdDigitPlaceValue`.
      1. Else:
         1. Let `valueZero` be the sum of `CHE_HEADER_VALUE_LENGTH_ONE_MAX` and one.
         1. Let `valueFirstDigit` be the result of `DecodeTaggedValue(valueFirstByte)`.
         1. Let `valueSecondDigit` be the result of `DecodeTaggedValue(valueSecondByte)`.
         1. Let `valueFirstCoefficient` be the sum of `CHE_HEADER_VALUE_LENGTH_TAGGED_MAX` and one.
         1. Let `valueSecondCoefficient` be equal to one.
         1. Let `valueFirstDigitPlaceValue` be the product of `valueFirstDigit` and `valueFirstCoefficient`.
         1. Let `valueSecondDigitPlaceValue` be the product of `valueSecondDigit` and `valueSecondCoefficient`.
         1. Let `valueLength` be the sum of `valueZero`, `valueFirstDigitPlaceValue`, and `valueSecondDigitPlaceValue`.
   1. Else:
      1. Let `valueLength` be the result of `DecodedTaggedValue(valueFirstByte)`.
   1. Let `valueEnd` be the sum of `index` and `valueLength`.
   1. Assert `valueEnd` is less than or equal to the length of `encoded`.
   1. Let `value` be the substring of `encoded` starting at `index` and ending before `valueEnd`.
   1. Set `index` to be `valueEnd`.
   1. Append the tuple `[name, value]` to `data`.
1. Return `data`.
### `EncodeTaggedValue(value: u8, next: boolean): u8`: pack part of a value length into a tagged byte
1. Let `upper` be the result of logically bit-shifting `value` to the left by one bit.
1. Clear the two least significant bits of `upper`.
1. Let `lower` be the least significant bit of `value`.
1. Let `nextFlag` be the resulting of shifting `next` (casted to a `u8`) by one bit.
1. Let `byte` be the result of a bitwise OR between `upper`, `lower`, and `nextFlag`.
1. Return `byte`.
### *`CompactEncode(data: [name: string | u16, value: string][]): string`: encode a header array into a CHE-encoded string*
1. Let `encoded` be a string containing the semicolon character.
1. For each `[name, value]` tuple of `data`:
   1. Assert `name` is a string or a number.
   1. If `name` is a string:
      1. Assert `name` is not empty.
      1. Assert the length of `name` is less than or equal to `CHE_HEADER_NAME_LENGTH_MAX`.
      1. Let `nameLengthByte` be the sum of `CHE_MIN_BYTE` and the length of `name`, minus one.
      1. Append the characters `CHE_MIN_BYTE` and `nameLengthByte` to `encoded`.
      1. Append `name` to `encoded`.
   1. Else, if `name` is a number:
      1. Assert the length of `name` is less than or equal to `CHE_HEADER_ID_MAX`.
      1. Let `divisor` be the sum of `CHE_BYTE_RANGE` and one.
      1. Let `nameFirstRaw` be `name` floor-divided by `divisor`.
      1. Let `nameSecondRaw` be `name` modulo `divisor`.
      1. Let `nameFirstByte` be the sum of `CHE_MIN_BYTE`, `nameFirstRaw`, and one.
      1. Let `nameSecondByte` be the sum of `CHE_MIN_BYTE` and one.
      1. Append the characters `nameFirstByte` and `nameSecondByte` to `encoded`.
   1. Assert the length of `value` is less than or equal to `CHE_HEADER_VALUE_LENGTH_MAX`.
   1. If the length of `value` is greater than `CHE_HEADER_VALUE_LENGTH_TWO_MAX`:
      1. Let `modifiedLength` be the length of `value` minus `CHE_HEADER_VALUE_LENGTH_TWO_MAX`, minus one.
      1. Let `valueLengthDivisorA` be the sum of `CHE_BYTE_RANGE` and one.
      1. Let `valueLengthDivisorB` be the sum of `CHE_HEADER_VALUE_LENGTH_TAGGED_MAX` and one.
      1. Let `valueLengthDivisorC` be the product of `valueLengthDivisorA` and `valueLengthDivisorB`.
      1. Let `valueLengthFirstUntagged` be `modifiedLength` floor-divided by `valueLengthDivisorC`.
      1. Let `valueLengthSecondUntagged` be `modifiedLength` floor-divided by `valueLengthDivisorA`, modulo `valueLengthDivisorB`.
      1. Let `valueLengthThirdUntagged` be `modifiedLength` modulo `valueLengthDivisorA`.
      1. Let `valueLengthFirstRaw` be the result of `EncodeTaggedValue(valueLengthFirstUntagged, true)`.
      1. Let `valueLengthSecondRaw` be the result of `EncodeTaggedValue(valueLengthSecondUntagged, true)`.
      1. Let `valueLengthThirdRaw` be equal to `valueLengthThirdUntagged`.
      1. Let `valueLengthFirst` be the sum of `CHE_MIN_BYTE` and `valueLengthFirstRaw`.
      1. Let `valueLengthSecond` be the sum of `CHE_MIN_BYTE` and `valueLengthSecondRaw`.
      1. Let `valueLengthThird` be the sum of `CHE_MIN_BYTE` and `valueLengthThirdRaw`.
      1. Append the characters `valueLengthFirst`, `valueLengthSecond`, and `valueLengthThird` to `encoded`.
   1. Else, if the length of `value` is greater than `CHE_HEADER_VALUE_LENGTH_ONE_MAX`:
      1. Let `modifiedLength` be the length of `value` minus `CHE_HEADER_VALUE_LENGTH_ONE_MAX`, minus one.
      1. Let `valueLengthDivisor` be the sum of `CHE_HEADER_VALUE_LENGTH_TAGGED_MAX` and one.
      1. Let `valueLengthFirstUntagged` be `modifiedLength` floor-divided by `valueLengthDivisor`.
      1. Let `valueLengthSecondUntagged` be `modifiedLength` modulo `valueLengthDivisor`.
      1. Let `valueLengthFirstRaw` be the result of `EncodeTaggedValue(valueLengthFirstUntagged, true)`.
      1. Let `valueLengthSecondRaw` be the result of `EncodeTaggedValue(valueLengthSecondUntagged, false)`.
      1. Let `valueLengthFirst` be the sum of `CHE_MIN_BYTE` and `valueLengthFirstRaw`.
      1. Let `valueLengthSecond` be the sum of `CHE_MIN_BYTE` and `valueLengthSecondRaw`.
      1. Append the characters `valueLengthFirst` and `valueLengthSecond` to `encoded`.
   1. Else:
      1. Let `valueLengthFirstUntagged` be the length of `value`.
      1. Let `valueLengthFirstRaw` be the result of `EncodeTaggedValue(valueLengthFirstUntagged, false)`.
      1. Let `valueLengthFirst` be the sum of `CHE_MIN_BYTE` and `valueLengthFirstRaw`.
      1. Append the character `valueLengthFirst` to `encoded`.
   1. Append `value` to `encoded`.
1. Return `encoded`.

# Reference Implementation
The reference implementation is located at [reference implementation](./index.mjs).