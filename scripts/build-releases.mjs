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
	{ key: 'bandcamp', label: 'bandcamp', icon: 'fab fa-bandcamp' },
];

const morePlatforms = [
	{ key: 'amazon', label: 'amazon music', icon: 'fab fa-amazon' },
	{ key: 'tidal', label: 'tidal', icon: 'fab fa-tidal' },
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

function platformLink(key, label, icon, url) {
	return `				<li><a class="platform-btn platform-btn--${esc(key)}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
					<i class="${icon}" aria-hidden="true"></i>
					<span>${esc(label)}</span>
				</a></li>`;
}

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

function ogType(release) {
	return release.type === 'Single' ? 'music.song' : 'music.album';
}

function releaseTitle(release) {
	return `${release.title} by gravemint`;
}

function releaseMetaDescription(release) {
	return release.metaDescription || release.description || '';
}

function releaseLongDescription(release) {
	return release.longDescription || release.description || '';
}

function releaseDatePublished(release) {
	return release.datePublished || release.year || '';
}

function artistRef() {
	return {
		'@type': 'MusicGroup',
		'@id': `${data.site}/#musicgroup`,
		name: data.artist,
		url: `${data.site}/`,
	};
}

function buildBreadcrumb(url, release) {
	return {
		'@type': 'BreadcrumbList',
		'@id': `${url}#breadcrumb`,
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: data.artist,
				item: `${data.site}/`,
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'music',
				item: `${data.site}/#music`,
			},
			{
				'@type': 'ListItem',
				position: 3,
				name: release.title,
				item: url,
			},
		],
	};
}

function buildReleaseSchema(release, url, ogImage) {
	const isSingle = release.type === 'Single';
	const schema = {
		'@type': isSingle ? 'MusicRecording' : 'MusicAlbum',
		'@id': `${url}#release`,
		name: release.title,
		url,
		image: ogImage,
		description: releaseLongDescription(release),
		datePublished: releaseDatePublished(release),
		inLanguage: 'en-US',
		byArtist: artistRef(),
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
	};

	if (!isSingle && release.trackCount) {
		schema.numTracks = release.trackCount;
		schema.albumReleaseType = release.type === 'EP' ? 'EP' : 'Album';
	}

	if (!isSingle && Array.isArray(release.tracks) && release.tracks.length) {
		schema.track = release.tracks.map((name, index) => ({
			'@type': 'MusicRecording',
			'@id': `${url}#track-${index + 1}`,
			name,
			position: index + 1,
			byArtist: artistRef(),
			inAlbum: { '@id': `${url}#release` },
		}));
	}

	const sameAs = Object.values(release.links).filter(Boolean);
	if (sameAs.length) schema.sameAs = sameAs;

	return schema;
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
					<p class="release-eyebrow">${esc(String(release.type).toLowerCase())} · ${esc(release.year)}</p>
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
	const title = releaseTitle(release);
	const ogImage = `${data.site}${release.cover}`;
	const ogTypeValue = ogType(release);
	const metaDesc = releaseMetaDescription(release);
	const longDesc = releaseLongDescription(release);
	const releaseDate = releaseDatePublished(release);
	const themeColor = data.seo?.themeColor || '#060606';
	const musicianUrl = `${data.site}/#musicgroup`;

	const primaryHtml = primaryPlatforms
		.filter((p) => release.links[p.key])
		.map((p) => platformLink(p.key, p.label, p.icon, release.links[p.key]))
		.join('\n');

	const moreHtml = morePlatforms
		.filter((p) => release.links[p.key])
		.map((p) => platformLink(p.key, p.label, p.icon, release.links[p.key]))
		.join('\n');

	const moreListId = `release-more-platforms-${release.slug}`;
	const headerHtml = moreHtml
		? `				<header class="release-hero-links-head">
					<h2 class="platform-heading">listen</h2>
					<button type="button" class="platform-more-toggle" aria-expanded="true" aria-controls="${esc(moreListId)}" data-platform-more hidden>
						<span class="visually-hidden">show more platforms</span>
						<span class="platform-more-plus" aria-hidden="true"></span>
					</button>
				</header>`
		: `				<h2 class="platform-heading">listen</h2>`;

	const moreSection = moreHtml
		? `				<ul id="${esc(moreListId)}" class="platform-list platform-grid platform-grid--more" data-platform-more-list>
${moreHtml}
				</ul>
`
		: '';

	const schemaGraph = {
		'@context': 'https://schema.org',
		'@graph': [buildBreadcrumb(url, release), buildReleaseSchema(release, url, ogImage)],
	};

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>${esc(title)}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="${esc(themeColor)}">
	<meta name="description" content="${esc(metaDesc)}">
	<link rel="canonical" href="${esc(url)}">
	<meta property="og:locale" content="en_US">
	<meta property="og:type" content="${esc(ogTypeValue)}">
	<meta property="og:site_name" content="gravemint">
	<meta property="og:title" content="${esc(release.title)} by gravemint">
	<meta property="og:description" content="${esc(metaDesc)}">
	<meta property="og:url" content="${esc(url)}">
	<meta property="og:image" content="${esc(ogImage)}">
	<meta property="og:image:type" content="image/jpeg">
	<meta property="og:image:width" content="800">
	<meta property="og:image:height" content="800">
	<meta property="og:image:alt" content="${esc(release.title)} cover art by gravemint">
	<meta property="music:musician" content="${esc(musicianUrl)}">
	${releaseDate ? `<meta property="music:release_date" content="${esc(releaseDate)}">\n\t` : ''}<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="${esc(release.title)} by gravemint">
	<meta name="twitter:description" content="${esc(metaDesc)}">
	<meta name="twitter:image" content="${esc(ogImage)}">
	<meta name="twitter:image:alt" content="${esc(release.title)} cover art by gravemint">
	<link rel="icon" href="/favicon.ico" sizes="any">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
	<link rel="preconnect" href="https://open.spotify.com" crossorigin>
	<link rel="preconnect" href="https://embed-cdn.spotifycdn.com" crossorigin>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@300;400&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="/style.css">
	<link rel="stylesheet" href="/release.css">
	<script type="application/ld+json">
${JSON.stringify(schemaGraph, null, '\t')}
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
					<iframe src="${esc(spotifyEmbedUrl(release.spotifyAlbumId))}" title="${esc(release.title)} on spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="eager"></iframe>
				</div>
			</div>
			<aside class="release-hero-links" aria-label="streaming and purchase links">
${headerHtml}
				<ul class="platform-list platform-grid">
${primaryHtml}
				</ul>
${moreSection}			</aside>
		</article>
${longDesc ? `
		<section class="release-about" aria-label="about ${esc(release.title)}">
			<h2 class="release-about-heading">about</h2>
			<p class="release-about-text">${esc(longDesc)}</p>
		</section>
` : ''}${Array.isArray(release.tracks) && release.tracks.length > 1 ? `
		<section class="release-tracks" aria-label="tracks">
			<details class="release-tracks-toggle">
				<summary class="release-tracks-summary">
					<span class="release-about-heading">tracks</span>
					<span class="release-tracks-indicator" aria-hidden="true"></span>
				</summary>
				<ol class="release-tracklist">
${release.tracks.map((t) => `					<li>${esc(t)}</li>`).join('\n')}
				</ol>
			</details>
		</section>
` : ''}	</main>

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

const buildDate = todayISO();
const sitemapUrls = [
	{ loc: `${data.site}/`, lastmod: buildDate },
	...data.releases.map((r) => ({
		loc: `${data.site}/music/${r.slug}/`,
		lastmod: r.lastmod || buildDate,
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

function buildHomeSchema() {
	const seo = data.seo || {};
	const sameAs = data.sameAs || [];
	const person = data.person;
	const discography = data.releases.map((release, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: release.title,
		url: `${data.site}/music/${release.slug}/`,
	}));

	const musicGroup = {
		'@type': ['MusicGroup', 'Organization'],
		'@id': `${data.site}/#musicgroup`,
		name: data.artist,
		url: `${data.site}/`,
		description: seo.homeDescription,
		foundingDate: seo.foundingDate,
		genre: seo.genre,
		logo: {
			'@type': 'ImageObject',
			'@id': `${data.site}/#logo`,
			url: `${data.site}/favicon-192.png`,
			contentUrl: `${data.site}/favicon-192.png`,
			width: 192,
			height: 192,
			caption: data.artist,
		},
		image: { '@id': `${data.site}/#logo` },
		sameAs,
	};

	const graph = [
		{
			'@type': 'WebSite',
			'@id': `${data.site}/#website`,
			url: `${data.site}/`,
			name: data.artist,
			description: seo.homeDescription,
			inLanguage: 'en-US',
			publisher: { '@id': `${data.site}/#musicgroup` },
			mainEntity: { '@id': `${data.site}/#musicgroup` },
		},
	];

	if (person) {
		const personSchema = {
			'@type': 'Person',
			'@id': `${data.site}/#person`,
			name: [person.givenName, person.familyName].filter(Boolean).join(' ') || person.alternateName || data.artist,
			alternateName: person.alternateName || data.artist,
			memberOf: { '@id': `${data.site}/#musicgroup` },
		};
		if (person.givenName) personSchema.givenName = person.givenName;
		if (person.familyName) personSchema.familyName = person.familyName;
		if (person.sameAs?.length) personSchema.sameAs = person.sameAs;
		graph.push(personSchema);
		musicGroup.member = { '@id': `${data.site}/#person` };
	}

	graph.push(musicGroup);
	graph.push({
		'@type': 'ItemList',
		'@id': `${data.site}/#discography`,
		name: `${data.artist} discography`,
		numberOfItems: discography.length,
		itemListElement: discography,
	});

	return {
		'@context': 'https://schema.org',
		'@graph': graph,
	};
}

function syncIndexSeo() {
	const seo = data.seo;
	if (!seo) return;

	const indexPath = path.join(root, 'index.html');
	let html = fs.readFileSync(indexPath, 'utf8');
	const site = data.site;
	const homeSchema = JSON.stringify(buildHomeSchema(), null, '\t');

	const themeColor = seo.themeColor || '#060606';
	const headBlock = `<head>
	<meta charset="utf-8">
	<title>${esc(seo.homeTitle)}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="theme-color" content="${esc(themeColor)}">
	<meta name="description" content="${esc(seo.homeDescription)}">
	<link rel="canonical" href="${esc(site)}/">
	<meta property="og:locale" content="en_US">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="gravemint">
	<meta property="og:title" content="${esc(seo.ogTitle)}">
	<meta property="og:description" content="${esc(seo.ogDescription)}">
	<meta property="og:url" content="${esc(site)}/">
	<meta property="og:image" content="${esc(site)}/og.jpg">
	<meta property="og:image:type" content="image/jpeg">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta property="og:image:alt" content="gravemint electronic music artist">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="${esc(seo.ogTitle)}">
	<meta name="twitter:description" content="${esc(seo.ogDescription)}">
	<meta name="twitter:image" content="${esc(site)}/og.jpg">
	<meta name="twitter:image:alt" content="gravemint electronic music artist">
	<link rel="icon" href="/favicon.ico" sizes="any">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
	<link rel="preconnect" href="https://open.spotify.com" crossorigin>
	<link rel="preconnect" href="https://embed-cdn.spotifycdn.com" crossorigin>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@300;400&display=swap" rel="stylesheet">
	<link rel="stylesheet" type="text/css" href="style.css">
	<script type="application/ld+json">
${homeSchema}
	</script>
</head>`;

	html = html.replace(/<head>[\s\S]*?<\/head>/, headBlock);
	fs.writeFileSync(indexPath, html);
	console.log('updated index.html SEO');
}

syncIndexEmbedHints();
syncIndexSeo();
