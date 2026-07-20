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

	// 1. Check for UTF-16 BOM
	if (
		(buffer[0] === 0xfe && buffer[1] === 0xff) || 
		(buffer[0] === 0xff && buffer[1] === 0xfe)
	) {
		throw new Error('UTF-16 BOM encoding is not supported. Please upload a UTF-8 encoded CSV file.');
	}

	// 2. Check for binary content (null bytes)
	const sampleLength = Math.min(buffer.length, 1024);
	for (let i = 0; i < sampleLength; i++) {
		if (buffer[i] === 0x00) {
			throw new Error('Binary file content detected. Please upload a valid text CSV file.');
		}
	}

	// 3. Check for UTF-8 BOM and decode
	let startOffset = 0;
	if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
		startOffset = 3;
	}

	const content = buffer.toString('utf8', startOffset);

	// 4. Auto-detect delimiter from the first few lines
	const sampleLines = content.split(/\r?\n/).slice(0, 5).join('\n');
	let commaCount = 0;
	let semicolonCount = 0;
	let tabCount = 0;

	// Simple frequency count of separators outside of quotes (for high-level detection)
	for (let i = 0; i < sampleLines.length; i++) {
		const char = sampleLines[i];
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

	// 5. Parse using csv-parse/sync
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
			encoding: startOffset === 3 ? 'UTF-8 with BOM' : 'UTF-8',
			headers,
			rows
		};
	} catch (e: any) {
		throw new Error(`CSV parsing failed: ${e.message || 'invalid CSV structure'}`);
	}
}
