import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Validates magic bytes of an uploaded image file and saves it securely to the project-assets directory.
 * Returns the saved filename.
 */
export async function saveProjectLogo(projectId: string, file: File): Promise<string> {
	const dataDir = process.env.DATA_DIRECTORY || './data';
	const assetsDir = path.join(dataDir, 'project-assets');

	// Ensure assets directory exists
	if (!fs.existsSync(assetsDir)) {
		fs.mkdirSync(assetsDir, { recursive: true });
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	if (buffer.length < 4) {
		throw new Error('Invalid image file content.');
	}

	// Check magic bytes
	const magic = buffer.toString('hex', 0, 4).toUpperCase();
	let ext = '';

	if (magic === '89504E47') {
		ext = '.png';
	} else if (magic.startsWith('FFD8FF')) {
		ext = '.jpg';
	} else if (magic === '52494646' && buffer.toString('utf8', 8, 12) === 'WEBP') {
		ext = '.webp';
	} else {
		throw new Error('Unsupported image format. Only PNG, JPEG, and WebP are allowed. SVG uploads are blocked.');
	}

	// Enforce a maximum file size of 2MB for logos
	if (buffer.length > 2 * 1024 * 1024) {
		throw new Error('Logo file size cannot exceed 2MB.');
	}

	// Create random filename to prevent name leaks and collisions
	const randomName = `${projectId}-${crypto.randomUUID()}${ext}`;
	const destPath = path.resolve(assetsDir, randomName);

	// Guard against path traversal
	const resolvedAssetsDir = path.resolve(assetsDir);
	if (!destPath.startsWith(resolvedAssetsDir)) {
		throw new Error('Path traversal violation blocked.');
	}

	// Write to filesystem
	fs.writeFileSync(destPath, buffer);
	return randomName;
}

/**
 * Remove an existing logo file.
 */
export function removeProjectLogo(filename: string) {
	try {
		const dataDir = process.env.DATA_DIRECTORY || './data';
		const assetsDir = path.join(dataDir, 'project-assets');
		const filePath = path.resolve(assetsDir, filename);

		if (filePath.startsWith(path.resolve(assetsDir)) && fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch (e) {
		console.error('[Assets] Error removing project logo:', e);
	}
}
