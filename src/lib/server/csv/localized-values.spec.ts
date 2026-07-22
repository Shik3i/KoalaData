import { describe, expect, it } from 'vitest';
import { parseCsv } from './parser';
import { parseDateString, parseNumericValue } from './pipeline';

describe('localized CSV values', () => {
	it('parses decimal and grouping separators', () => {
		expect(parseNumericValue('1,234')).toBe(1234);
		expect(parseNumericValue('1.234')).toBe(1234);
		expect(parseNumericValue('1 234,5')).toBe(1234.5);
		expect(parseNumericValue('1,234.5')).toBe(1234.5);
		expect(parseNumericValue('(42)')).toBe(-42);
	});

	it('parses deterministic localized dates and rejects impossible dates', () => {
		expect(parseDateString('2026/07/18')).toBe('2026-07-18');
		expect(parseDateString('18.07.2026')).toBe('2026-07-18');
		expect(() => parseDateString('2026-02-31')).toThrow('Unrecognized date format');
	});

	it('supports UTF-16LE and ignores delimiters inside quoted fields', () => {
		const text = 'date;label;value\r\n2026-07-18;"hello, world";12';
		const buffer = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
		const parsed = parseCsv(buffer);
		expect(parsed.encoding).toBe('UTF-16 LE');
		expect(parsed.delimiter).toBe(';');
		expect(parsed.rows[0]).toEqual(['2026-07-18', 'hello, world', '12']);
	});
});
