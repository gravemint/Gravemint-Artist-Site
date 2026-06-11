#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'releases.json'), 'utf8'));

const defaultCredit = data.artCredit?.name || 'unknown';
const defaultRightsHolder = data.rightsHolder || data.artist || defaultCredit;
const siteUrl = data.site || '';

function checkExiftool() {
	try {
		execFileSync('exiftool', ['-ver'], { stdio: 'ignore' });
	} catch {
		console.error('exiftool not found. install with: brew install exiftool');
		process.exit(1);
	}
}

function stampFile(filePath, fields) {
	const args = [
		'-overwrite_original',
		'-codedcharacterset=utf8',
		`-Artist=${fields.creator}`,
		`-Creator=${fields.creator}`,
		`-By-line=${fields.creator}`,
		`-Copyright=${fields.copyright}`,
		`-CopyrightNotice=${fields.copyright}`,
		`-Rights=${fields.copyright}`,
		`-Credit=${fields.credit}`,
		`-CreditLine=${fields.credit}`,
		`-URL=${fields.url}`,
		`-WebStatement=${fields.url}`,
		`-ImageDescription=${fields.description}`,
		`-Description=${fields.description}`,
		`-Caption-Abstract=${fields.description}`,
		`-XMP-photoshop:Source=${fields.url}`,
		filePath,
	];

	execFileSync('exiftool', args, { stdio: 'pipe' });
}

function processRelease(release) {
	const gallery = Array.isArray(release.gallery) ? release.gallery : [];
	if (!gallery.length) return 0;

	let stamped = 0;
	for (const item of gallery) {
		if (!item || !item.src) continue;
		const rel = item.src.startsWith('/')
			? item.src
			: `/images/releases/${release.slug}/${item.src}`;
		const filePath = path.join(root, rel.replace(/^\//, ''));
		if (!fs.existsSync(filePath)) {
			console.warn(`skip (missing): ${rel}`);
			continue;
		}

		const creator = item.credit || defaultCredit;
		const rightsHolder = item.rightsHolder || defaultRightsHolder;
		const year = release.year || new Date().getFullYear();
		const copyright = `© ${year} ${rightsHolder}`;
		const credit = `art by ${creator}`;
		const description = item.alt || `${release.title} art by ${creator}`;

		try {
			stampFile(filePath, {
				creator,
				copyright,
				credit,
				url: siteUrl,
				description,
			});
			console.log(`stamped ${rel}`);
			stamped++;
		} catch (err) {
			console.error(`failed to stamp ${rel}: ${err.message}`);
		}
	}
	return stamped;
}

function main() {
	checkExiftool();
	let total = 0;
	for (const release of data.releases) {
		total += processRelease(release);
	}
	console.log(`\nstamped ${total} image${total === 1 ? '' : 's'}`);
}

main();
