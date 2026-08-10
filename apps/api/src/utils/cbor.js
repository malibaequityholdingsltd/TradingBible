// Minimal CBOR decoder — enough to parse WebAuthn attestationObject/authData.
// Handles maps, arrays, byte/text strings, unsigned/signed ints, floats, booleans.

export function decodeCbor(buf) {
	const { value, offset } = decodeItem(buf, 0);
	if (offset !== buf.length) {
		// tolerate trailing bytes (allowed in practice by browsers)
	}
	return value;
}

function readLength(buf, offset, extraInfo) {
	if (extraInfo < 24) return { length: extraInfo, offset };
	if (extraInfo === 24) return { length: buf.readUInt8(offset), offset: offset + 1 };
	if (extraInfo === 25) return { length: buf.readUInt16BE(offset), offset: offset + 2 };
	if (extraInfo === 26) return { length: buf.readUInt32BE(offset), offset: offset + 4 };
	if (extraInfo === 27) {
		const big = buf.readBigUInt64BE(offset);
		if (big > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('CBOR length too large');
		return { length: Number(big), offset: offset + 8 };
	}
	throw new Error(`Cannot read length for extra info ${extraInfo}`);
}

function decodeItem(buf, offset) {
	if (offset >= buf.length) throw new Error('CBOR truncated');
	const initial = buf[offset];
	const major = initial >> 5;
	const extraInfo = initial & 0x1f;
	const { length, offset: next } = readLength(buf, offset + 1, extraInfo);

	switch (major) {
		case 0: return { value: length, offset: next };
		case 1: return { value: -1 - length, offset: next };
		case 2: return { value: Buffer.from(buf.subarray(next, next + length)), offset: next + length };
		case 3: return { value: buf.subarray(next, next + length).toString('utf8'), offset: next + length };
		case 4: {
			const arr = [];
			let at = next;
			for (let i = 0; i < length; i++) {
				const item = decodeItem(buf, at);
				arr.push(item.value);
				at = item.offset;
			}
			return { value: arr, offset: at };
		}
		case 5: {
			const map = {};
			let at = next;
			for (let i = 0; i < length; i++) {
				const keyItem = decodeItem(buf, at);
				const valItem = decodeItem(buf, keyItem.offset);
				map[String(keyItem.value)] = valItem.value;
				at = valItem.offset;
			}
			return { value: map, offset: at };
		}
		case 6: {
			// tag — unwrap and return the tagged value
			const inner = decodeItem(buf, next);
			return { value: inner.value, offset: inner.offset };
		}
		case 7:
			if (extraInfo === 20) return { value: false, offset: next };
			if (extraInfo === 21) return { value: true, offset: next };
			if (extraInfo === 22) return { value: null, offset: next };
			if (extraInfo === 23) return { value: undefined, offset: next };
			if (extraInfo === 25) return { value: buf.readFloatBE(next), offset: next + 2 };
			if (extraInfo === 26) return { value: buf.readFloatBE(next), offset: next + 4 };
			if (extraInfo === 27) return { value: buf.readDoubleBE(next), offset: next + 8 };
			throw new Error(`Unsupported CBOR simple value ${extraInfo}`);
		default:
			throw new Error(`Unsupported CBOR major type ${major}`);
	}
}

export function b64url(n) {
	return Buffer.from(n).toString('base64url');
}

export function b64urlDecode(s) {
	return Buffer.from(String(s).replace(/[-_]/g, (m) => (m === '-' ? '+' : '/')) + '='.repeat((4 - (s.length % 4)) % 4), 'base64');
}