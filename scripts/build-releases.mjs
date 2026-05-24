import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'releases.json'), 'utf8'));
const logoFiltersSvg = fs.readFileSync(
	path.join(root, 'partials/logo-filters.svg.html'),
	'utf8'
);

const primaryPlatforms = [
	{ key: 'spotify', label: 'spotify', icon: 'fab fa-spotify' },
	{ key: 'apple', label: 'apple music', icon: 'fab fa-apple' },
	{ key: 'youtube', label: 'youtube', icon: 'fab fa-youtube' },
];

const morePlatforms = [
	{ key: 'amazon', label: 'amazon music', icon: 'fab fa-amazon' },
	{ key: 'tidal', label: 'tidal', icon: 'fa-solid fa-water' },
	{ key: 'deezer', label: 'deezer', icon: 'fab fa-deezer' },
	{ key: 'iheart', label: 'iheartradio', icon: 'fa-solid fa-heart' },
];

function esc(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function spotifyEmbedUrl(albumId) {
	return `https://open.spotify.com/embed/album/${albumId}?utm_source=generator&theme=0`;
}

function platformLink(key, label, icon, url, extraClass = '') {
	return `				<li><a class="platform-btn${extraClass}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
					<i class="${icon}" aria-hidden="true"></i>
					<span>${esc(label)}</span>
				</a></li>`;
}

function schemaType(type) {
	if (type === 'Single') return 'https://schema.org/MusicRecording';
	return 'https://schema.org/MusicAlbum';
}

function resolveCoverFull(release) {
	if (release.coverFull) return release.coverFull;

	const coverRel = release.cover.replace(/^\//, '');
	const ext = path.extname(coverRel);
	const base = coverRel.slice(0, -ext.length);
	const largeRel = `${base}-large${ext}`;
	if (fs.existsSync(path.join(root, largeRel))) {
		return `/${largeRel}`;
	}

	return data.coverFullPlaceholder ?? '/images/releases/placeholder-large.svg';
}

function buildArtCreditHtml() {
	const credit = data.artCredit;
	if (!credit?.name || !credit?.instagram) return '';

	return `					<p class="release-art-credit">art by <a href="${esc(credit.instagram)}" target="_blank" rel="noopener noreferrer">${esc(credit.name)}</a></p>
`;
}

function buildArtMetaHtml(release) {
	return `				<div class="release-hero-art-meta">
					<p class="release-eyebrow">${esc(release.type)} · ${esc(release.year)}</p>
${buildArtCreditHtml()}				</div>
`;
}

function buildArtHtml(release) {
	const coverFull = resolveCoverFull(release);

	return `			<div class="release-hero-art-col">
				<button type="button" class="release-hero-art-wrap release-art-open" data-art-full="${esc(coverFull)}" aria-label="view full cover art for ${esc(release.title)}">
					<img class="release-hero-art" src="${esc(release.cover)}" alt="${esc(release.title)} cover art" width="800" height="800" fetchpriority="high">
					<span class="release-art-hint" aria-hidden="true">view art</span>
				</button>
${buildArtMetaHtml(release)}			</div>`;
}

function buildPage(release) {
	const url = `${data.site}/music/${release.slug}/`;
	const title = `${release.title} | gravemint`;
	const ogImage = `${data.site}${release.cover}`;

	const primaryHtml = primaryPlatforms
		.filter((p) => release.links[p.key])
		.map((p) => platformLink(p.key, p.label, p.icon, release.links[p.key]))
		.join('\n');

	const bandcampHtml = release.links.bandcamp
		? platformLink('bandcamp', 'Bandcamp', 'fab fa-bandcamp', release.links.bandcamp, ' platform-btn--support')
		: '';

	const moreHtml = morePlatforms
		.filter((p) => release.links[p.key])
		.map((p) => platformLink(p.key, p.label, p.icon, release.links[p.key]))
		.join('\n');

	const moreSection = moreHtml
		? `			<details class="platform-more">
				<summary>more platforms</summary>
				<ul class="platform-list platform-list--more">
${moreHtml}
				</ul>
			</details>`
		: '';

	const schema = {
		'@context': 'https://schema.org',
		'@type': release.type === 'Single' ? 'MusicRecording' : 'MusicAlbum',
		'@id': `${url}#release`,
		name: release.title,
		url,
		image: ogImage,
		description: release.description,
		datePublished: release.year,
		byArtist: {
			'@type': 'MusicGroup',
			'@id': `${data.site}/#musicgroup`,
			name: data.artist,
			url: `${data.site}/`,
		},
	};

	const sameAs = Object.values(release.links).filter(Boolean);
	if (sameAs.length) schema.sameAs = sameAs;

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<title>${esc(title)}</title>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="${esc(release.description)}">
	<link rel="canonical" href="${esc(url)}">
	<meta property="og:type" content="music.album">
	<meta property="og:site_name" content="gravemint">
	<meta property="og:title" content="${esc(release.title)} — gravemint">
	<meta property="og:description" content="${esc(release.description)}">
	<meta property="og:url" content="${esc(url)}">
	<meta property="og:image" content="${esc(ogImage)}">
	<meta property="og:image:alt" content="${esc(release.title)} cover art">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="${esc(release.title)} — gravemint">
	<meta name="twitter:description" content="${esc(release.description)}">
	<meta name="twitter:image" content="${esc(ogImage)}">
	<link rel="icon" href="/favicon.ico" sizes="any">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
	<link rel="preconnect" href="https://open.spotify.com" crossorigin>
	<link rel="preconnect" href="https://embed-cdn.spotifycdn.com" crossorigin>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@300;400&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="/style.css">
	<link rel="stylesheet" href="/release.css">
	<script type="application/ld+json">
${JSON.stringify(schema, null, '\t')}
	</script>
</head>
<body class="release-page">
${logoFiltersSvg}	<div class="page-bg" aria-hidden="true"></div>
	<canvas id="ghost-canvas" aria-hidden="true"></canvas>

	<main class="release-main">
		<header class="release-header">
			<a class="logo" href="/">
				<img src="/images/logo@2x.png" alt="gravemint" width="626" height="142">
			</a>
			<a class="release-back" href="/#music">← all music</a>
		</header>

		<article class="release-hero">
			<header class="release-hero-head">
				<h1 class="release-page-title">${esc(release.title)}</h1>
			</header>
${buildArtHtml(release)}
			<div class="release-hero-stage">
				<div class="spotify-wrap embed-wrap release-embed">
					<iframe src="${esc(spotifyEmbedUrl(release.spotifyAlbumId))}" title="${esc(release.title)} on Spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="eager"></iframe>
				</div>
			</div>
			<aside class="release-hero-links" aria-label="streaming and purchase links">
				<div class="release-links-group">
					<h2 class="platform-heading">listen</h2>
					<ul class="platform-list platform-list--primary">
${primaryHtml}
					</ul>
				</div>
				<div class="release-links-group">
					<h2 class="platform-heading platform-heading--support">support</h2>
					<ul class="platform-list platform-list--support">
${bandcampHtml}
					</ul>
				</div>
${moreSection}
			</aside>
		</article>
	</main>

	<div class="art-lightbox" hidden aria-hidden="true">
		<div class="art-lightbox-backdrop" data-art-close tabindex="-1"></div>
		<div class="art-lightbox-dialog" role="dialog" aria-modal="true" aria-label="cover art">
			<button type="button" class="art-lightbox-close" data-art-close aria-label="close">×</button>
			<img class="art-lightbox-img" src="" alt="">
		</div>
	</div>

	<script src="/release.js" defer></script>
	<script src="/main.js" defer></script>
</body>
</html>
`;
}

for (const release of data.releases) {
	const dir = path.join(root, 'music', release.slug);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'index.html'), buildPage(release));
	console.log(`wrote music/${release.slug}/index.html`);
}

const sitemapUrls = [
	{ loc: `${data.site}/`, lastmod: '2026-05-23' },
	...data.releases.map((r) => ({
		loc: `${data.site}/music/${r.slug}/`,
		lastmod: '2026-05-23',
	})),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
	.map(
		(u) => `	<url>
		<loc>${u.loc}</loc>
		<lastmod>${u.lastmod}</lastmod>
	</url>`
	)
	.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
console.log('updated sitemap.xml');

function syncIndexEmbedHints() {
	const indexPath = path.join(root, 'index.html');
	let html = fs.readFileSync(indexPath, 'utf8');

	for (const release of data.releases) {
		const href = `/music/${release.slug}/`;
		const embed = esc(spotifyEmbedUrl(release.spotifyAlbumId));
		const pattern = new RegExp(
			`(<a class="release-(?:card|link)" href="${href.replace(/\//g, '\\/')}")([^>]*>)`,
			'g'
		);
		html = html.replace(pattern, (match, start, rest) => {
			if (rest.includes('data-spotify-embed=')) return match;
			return `${start} data-spotify-embed="${embed}"${rest}`;
		});
	}

	fs.writeFileSync(indexPath, html);
	console.log('updated index.html embed hints');
}

syncIndexEmbedHints();
