import { describe, it, expect } from 'vitest';
import { parseCsv } from './parser';

describe('CSV Parser', () => {
	it('should parse standard comma-delimited CSV', () => {
		const csvData = `date,active_users,installs\n2026-07-01,120,10\n2026-07-02,125,12`;
		const buffer = Buffer.from(csvData, 'utf-8');
		const result = parseCsv(buffer);

		expect(result.delimiter).toBe(',');
		expect(result.headers).toEqual(['date', 'active_users', 'installs']);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual(['2026-07-01', '120', '10']);
	});

	it('should parse semicolon-delimited CSV', () => {
		const csvData = `date;active_users;installs\n2026-07-01;120;10\n2026-07-02;125;12`;
		const buffer = Buffer.from(csvData, 'utf-8');
		const result = parseCsv(buffer);

		expect(result.delimiter).toBe(';');
		expect(result.headers).toEqual(['date', 'active_users', 'installs']);
	});

	it('should parse tab-delimited CSV', () => {
		const csvData = `date\tactive_users\tinstalls\n2026-07-01\t120\t10`;
		const buffer = Buffer.from(csvData, 'utf-8');
		const result = parseCsv(buffer);

		expect(result.delimiter).toBe('\t');
	});

	it('should parse and strip UTF-8 BOM', () => {
		const csvData = `date,active_users\n2026-07-01,100`;
		const bomBuffer = Buffer.concat([
			Buffer.from([0xef, 0xbb, 0xbf]),
			Buffer.from(csvData, 'utf-8')
		]);
		const result = parseCsv(bomBuffer);

		expect(result.encoding).toBe('UTF-8 with BOM');
		expect(result.headers[0]).toBe('date');
	});

	it('skips leading AMO metadata comments before the CSV header', () => {
		const csvData = [
			'#    addons.mozilla.org Statistics for add-on KoalaSync#',
			'#    Generated Wed Jul 29 21:24:55 2026 +0000',
			'#    from https://addons.mozilla.org/en-US/firefox/addon/koalasync/statistics/downloads-day-20250729-20260728.csv',
			'date,count',
			'2026-07-28,2',
			'2026-07-27,3'
		].join('\r\n');

		const result = parseCsv(Buffer.from(csvData));

		expect(result.headers).toEqual(['date', 'count']);
		expect(result.rows).toEqual([
			['2026-07-28', '2'],
			['2026-07-27', '3']
		]);
	});

	it('does not strip hash-prefixed data after the header', () => {
		const result = parseCsv(Buffer.from('date,label\n2026-07-28,#featured'));
		expect(result.rows[0]).toEqual(['2026-07-28', '#featured']);
	});

	it('should parse UTF-16 files with a byte-order mark', () => {
		const content = 'date;value\r\n2026-07-18;12';
		const leBom = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(content, 'utf16le')]);
		expect(parseCsv(leBom)).toMatchObject({ encoding: 'UTF-16 LE', delimiter: ';' });

		const beBody = Buffer.from(content, 'utf16le');
		beBody.swap16();
		const beBom = Buffer.concat([Buffer.from([0xfe, 0xff]), beBody]);
		expect(parseCsv(beBom)).toMatchObject({ encoding: 'UTF-16 BE', delimiter: ';' });
	});

	it('should reject binary file content containing null bytes', () => {
		const binaryData = Buffer.from([0x64, 0x61, 0x74, 0x65, 0x00, 0x01, 0x02]);
		expect(() => parseCsv(binaryData)).toThrow('Binary file content detected');
	});

	it('rejects empty, header-only, and duplicate-header files', () => {
		expect(() => parseCsv(Buffer.alloc(0))).toThrow('CSV file is empty');
		expect(() => parseCsv(Buffer.from('date,value\n'))).toThrow('header but no data rows');
		expect(() => parseCsv(Buffer.from('date,value,VALUE\n2026-07-22,1,2\n'))).toThrow('duplicate column headers');
	});
});
