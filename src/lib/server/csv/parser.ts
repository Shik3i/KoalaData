import { parse } from 'csv-parse/sync';

export interface ParsedCsv {
	delimiter: string;
	encoding: string;
	headers: string[];
	rows: string[][];
}

/**
 * Pre-inspects a CSV file buffer for encoding, binary content, and delimiter.
 * Then parses the CSV content using the csv-parse library.
 */
export function parseCsv(buffer: Buffer): ParsedCsv {
	if (buffer.length === 0) {
		throw new Error('CSV file is empty.');
	}

	// 1. Decode common spreadsheet encodings with explicit byte-order marks.
	let content: string;
	let encoding = 'UTF-8';
	if (buffer[0] === 0xff && buffer[1] === 0xfe) {
		content = buffer.subarray(2).toString('utf16le');
		encoding = 'UTF-16 LE';
	} else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
		const body = Buffer.from(buffer.subarray(2));
		if (body.length % 2 !== 0) throw new Error('CSV contains an incomplete UTF-16 code unit.');
		body.swap16();
		content = body.toString('utf16le');
		encoding = 'UTF-16 BE';
	} else {
		const startOffset = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf ? 3 : 0;
		content = buffer.toString('utf8', startOffset);
		if (startOffset === 3) encoding = 'UTF-8 with BOM';
	}

	// 2. Check for binary content (null bytes after decoding known UTF-16 files)
	const sampleLength = Math.min(buffer.length, 1024);
	if (encoding.startsWith('UTF-8')) {
		for (let i = 0; i < sampleLength; i++) {
			if (buffer[i] !== 0x00) continue;
			throw new Error('Binary file content detected. Please upload a valid text CSV file.');
		}
	}

	// 3. Auto-detect delimiter from the first few lines, ignoring quoted content.
	const sampleLines = content.split(/\r?\n/).slice(0, 5).join('\n');
	let commaCount = 0;
	let semicolonCount = 0;
	let tabCount = 0;

	let quoted = false;
	for (let i = 0; i < sampleLines.length; i++) {
		const char = sampleLines[i];
		if (char === '"') {
			if (quoted && sampleLines[i + 1] === '"') {
				i++;
				continue;
			}
			quoted = !quoted;
			continue;
		}
		if (quoted) continue;
		if (char === ',') commaCount++;
		else if (char === ';') semicolonCount++;
		else if (char === '\t') tabCount++;
	}

	let delimiter = ',';
	if (semicolonCount > commaCount && semicolonCount > tabCount) {
		delimiter = ';';
	} else if (tabCount > commaCount && tabCount > semicolonCount) {
		delimiter = '\t';
	}

	// 4. Parse using csv-parse/sync
	try {
		const records: string[][] = parse(content, {
			delimiter,
			skip_empty_lines: true,
			trim: true,
			relax_column_count: true // allows parsing rows with warnings instead of failing immediately
		});

		if (records.length === 0) {
			throw new Error('CSV file contains no rows.');
		}

		let headers = records[0].map((h) => h.trim());
		let rows = records.slice(1);

		// If the first row contains only 1 column, and the second row exists and contains more columns,
		// then the first row is a metadata/title line. Let's skip it!
		if (records.length > 1 && records[0].length === 1 && records[1].length > 1) {
			headers = records[1].map((h) => h.trim());
			rows = records.slice(2);
		}

		return {
			delimiter,
			encoding,
			headers,
			rows
		};
	} catch (e: any) {
		throw new Error(`CSV parsing failed: ${e.message || 'invalid CSV structure'}`);
	}
}
