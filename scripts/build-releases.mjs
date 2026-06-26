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
	{ key: 'soundcloud', label: 'soundcloud', icon: 'fab fa-soundcloud' },
	{ key: 'amazon', label: 'amazon music', icon: 'fab fa-amazon' },
	{ key: 'tidal', label: 'tidal', icon: 'fab fa-tidal' },
	{ key: 'deezer', label: 'deezer', icon: 'fab fa-deezer' },
	{ key: 'iheart', label: 'iheartradio', icon: 'fa-solid fa-heart' },
];

const preSavePlatforms = [
	{ key: 'spotify', label: 'spotify', icon: 'fab fa-spotify' },
	{ key: 'apple', label: 'apple music', icon: 'fab fa-apple' },
	{ key: 'deezer', label: 'deezer', icon: 'fab fa-deezer' },
	{ key: 'amazon', label: 'amazon music', icon: 'fab fa-amazon' },
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

function isPreSave(release) {
	return release.preSave === true;
}

function isPlaceholderCover(release) {
	return !release.cover || release.cover.includes('placeholder');
}

function resolveOgImage(release, gallery) {
	const coverItem = gallery?.find((item) => item.type === 'cover') || gallery?.[0];
	if (coverItem?.src) {
		return `${data.site}${coverItem.src}`;
	}

	return `${data.site}${release.cover}`;
}

function ogImageDimensions(release, gallery) {
	const coverItem = gallery?.find((item) => item.type === 'cover') || gallery?.[0];
	if (coverItem?.width && coverItem?.height) {
		return { width: coverItem.width, height: coverItem.height };
	}

	return { width: 800, height: 800 };
}

function ogImageType(coverPath) {
	return coverPath.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
}

function platformLink(key, label, icon, url, { pending = false } = {}) {
	if (pending) {
		return `				<li><span class="platform-btn platform-btn--${esc(key)} platform-btn--pending" aria-disabled="true">
					<i class="${icon}" aria-hidden="true"></i>
					<span>${esc(label)}</span>
				</span></li>`;
	}

	return `				<li><a class="platform-btn platform-btn--${esc(key)}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
					<i class="${icon}" aria-hidden="true"></i>
					<span>${esc(label)}</span>
				</a></li>`;
}

function buildPlatformLinksHtml(release, platforms) {
	return platforms
		.filter((p) => release.links?.[p.key])
		.map((p) => platformLink(p.key, p.label, p.icon, release.links[p.key]))
		.join('\n');
}

function preSaveHubButton(hubUrl) {
	return `				<li><a class="platform-btn platform-btn--presave-hub" href="${esc(hubUrl)}" target="_blank" rel="noopener noreferrer">
					<i class="fa-solid fa-bookmark" aria-hidden="true"></i>
					<span>pre-save</span>
				</a></li>`;
}

function buildPreSaveLinksHtml(release) {
	const hub = release.preSaveHub;
	const direct = buildPlatformLinksHtml(release, preSavePlatforms);

	if (direct) {
		return direct;
	}

	if (hub) {
		return preSaveHubButton(hub);
	}

	return '';
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

const META_DESC_MIN = 25;
const META_DESC_MAX = 160;

function assertMetaDescriptionsValid() {
	const errors = [];

	const home = data.seo?.homeDescription ?? '';
	if (home.length < META_DESC_MIN || home.length > META_DESC_MAX) {
		errors.push({ label: 'seo.homeDescription (homepage)', text: home, len: home.length });
	}

	for (const release of data.releases) {
		const desc = releaseMetaDescription(release);
		if (desc.length < META_DESC_MIN || desc.length > META_DESC_MAX) {
			errors.push({
				label: `${release.slug} (metaDescription)`,
				text: desc,
				len: desc.length,
			});
		}
	}

	if (!errors.length) return;

	console.error(
		`meta description length must be between ${META_DESC_MIN} and ${META_DESC_MAX} characters:`
	);
	for (const { label, len, text } of errors) {
		console.error(`  ${label}: ${len} chars`);
		console.error(`    ${text}`);
	}
	process.exit(1);
}

assertMetaDescriptionsValid();

function releaseLongDescription(release) {
	return release.longDescription || release.description || '';
}

function releaseDatePublished(release) {
	return release.datePublished || release.releaseDate || release.year || '';
}

function preSaveDayOrdinal(day) {
	if (day >= 11 && day <= 13) return `${day}th`;
	const ones = day % 10;
	if (ones === 1) return `${day}st`;
	if (ones === 2) return `${day}nd`;
	if (ones === 3) return `${day}rd`;
	return `${day}th`;
}

function preSaveReleaseLine(release) {
	if (!release.releaseDate) return '';

	const date = new Date(`${release.releaseDate}T12:00:00`);
	if (Number.isNaN(date.getTime())) return '';

	const months = [
		'january',
		'february',
		'march',
		'april',
		'may',
		'june',
		'july',
		'august',
		'september',
		'october',
		'november',
		'december',
	];
	const month = months[date.getMonth()];
	const day = preSaveDayOrdinal(date.getDate());
	return `this song releases on ${month} ${day}`;
}

function twitterMetaHtml() {
	const handle = data.seo?.twitterHandle;
	if (!handle) return '';
	const at = handle.startsWith('@') ? handle : `@${handle}`;
	return `\t<meta name="twitter:site" content="${esc(at)}">
\t<meta name="twitter:creator" content="${esc(at)}">
`;
}

function artistRef() {
	return {
		'@type': 'MusicGroup',
		'@id': `${data.site}/#musicgroup`,
		name: data.artist,
		url: `${data.site}/`,
	};
}

function imageRightsFields(item, release) {
	const credit = data.artCredit || {};
	const rights = data.imageRights || {};
	const creatorName = item?.credit || credit.name;
	const rightsHolder = item?.rightsHolder || data.rightsHolder || data.artist;
	const year = release?.year || new Date().getFullYear();
	const fields = {};

	if (creatorName) {
		fields.creditText = `art by ${creatorName}`;
		fields.copyrightNotice = `© ${year} ${rightsHolder}`;
		fields.creator = {
			'@type': 'Person',
			name: creatorName,
			...(credit.instagram ? { url: credit.instagram } : {}),
		};
	} else {
		fields.copyrightNotice = `© ${year} ${rightsHolder}`;
		fields.creator = {
			'@type': 'Organization',
			name: data.artist,
			url: `${data.site}/`,
		};
	}

	const licenseUrl = item?.license || credit.license || rights.license;
	const acquireUrl = item?.acquireLicensePage || credit.acquireLicensePage || rights.acquireLicensePage;
	if (licenseUrl) fields.license = licenseUrl;
	if (acquireUrl) fields.acquireLicensePage = acquireUrl;

	return fields;
}

function buildGalleryImageObject(item, release, pageUrl, index) {
	const node = {
		'@type': 'ImageObject',
		'@id': `${pageUrl}#image-${index + 1}`,
		contentUrl: `${data.site}${item.src}`,
		url: `${data.site}${item.src}`,
		name: `${release.title} ${item.type}`,
		description: item.alt,
		caption: item.alt,
		representativeOfPage: index === 0,
		...imageRightsFields(item, release),
	};
	if (item.width) node.width = item.width;
	if (item.height) node.height = item.height;
	return node;
}

function siteBrandImageRights() {
	const rights = data.imageRights || {};
	const year = new Date().getFullYear();
	return {
		creditText: data.artist,
		copyrightNotice: `© ${year} ${data.artist}`,
		creator: {
			'@type': 'Organization',
			name: data.artist,
			url: `${data.site}/`,
		},
		...(rights.license ? { license: rights.license } : {}),
		...(rights.acquireLicensePage ? { acquireLicensePage: rights.acquireLicensePage } : {}),
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

function buildReleaseSchema(release, url, ogImage, gallery) {
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
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': url,
			name: `${release.title} by ${data.artist}`,
			isPartOf: { '@id': `${data.site}/#website` },
			publisher: { '@id': `${data.site}/#musicgroup` },
		},
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

	if (Array.isArray(gallery) && gallery.length) {
		schema.associatedMedia = gallery.map((item, index) =>
			buildGalleryImageObject(item, release, url, index)
		);
	}

	const sameAs = [
		...(release.preSaveHub ? [release.preSaveHub] : []),
		...Object.values(release.links || {}).filter(Boolean),
	];
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

function resolveGallery(release) {
	const items = Array.isArray(release.gallery) ? release.gallery : [];

	if (!items.length) {
		return [
			{
				src: resolveCoverFull(release),
				alt: `${release.title} cover art by gravemint`,
				type: 'cover',
			},
		];
	}

	return items
		.filter((item) => item && item.src)
		.map((item) => {
			const src = item.src.startsWith('/')
				? item.src
				: `/images/releases/${release.slug}/${item.src}`;
			return {
				src,
				alt: item.alt || `${release.title} ${item.type || 'art'} by gravemint`,
				type: item.type || 'art',
				caption: item.caption || '',
				width: item.width || null,
				height: item.height || null,
			};
		});
}

function buildArtCreditHtml() {
	const credit = data.artCredit;
	if (!credit?.name || !credit?.instagram) return '';

	return `					<p class="release-art-credit">art by <a href="${esc(credit.instagram)}" target="_blank" rel="noopener noreferrer">${esc(credit.name)}</a></p>
`;
}

function buildArtMetaHtml(release) {
	const eyebrow = isPreSave(release)
		? `${String(release.type).toLowerCase()} · coming soon`
		: `${String(release.type).toLowerCase()} · ${release.year}`;

	return `				<div class="release-hero-art-meta">
					<p class="release-eyebrow">${esc(eyebrow)}</p>
${buildArtCreditHtml()}				</div>
`;
}

function buildPreSaveArtHtml(release) {
	return `			<div class="release-hero-art-col">
				<div class="release-hero-art-wrap release-hero-art-wrap--static">
					<img class="release-hero-art" src="${esc(release.cover)}" alt="${esc(release.title)} cover art placeholder" width="800" height="800" fetchpriority="high">
				</div>
${buildArtMetaHtml(release)}			</div>`;
}

function buildHeroStageHtml(release) {
	if (isPreSave(release)) {
		const releaseLine = preSaveReleaseLine(release);
		const dateLine = releaseLine
			? `\n\t\t\t\t\t<p class="release-presave-date">${esc(releaseLine)}</p>`
			: '';

		return `			<div class="release-hero-stage">
				<div class="release-presave-stage">
					<p class="release-presave-kicker">coming soon</p>${dateLine}
				</div>
			</div>`;
	}

	return `			<div class="release-hero-stage">
				<div class="spotify-wrap embed-wrap release-embed">
					<iframe src="${esc(spotifyEmbedUrl(release.spotifyAlbumId))}" title="${esc(release.title)} on spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
				</div>
			</div>`;
}

function buildMoreMusicHtml(currentRelease) {
	const others = data.releases.filter((r) => r.slug !== currentRelease.slug);
	if (!others.length) return '';

	const items = others
		.map((r) => {
			const eyebrow = isPreSave(r)
				? `${String(r.type).toLowerCase()} · coming soon`
				: `${String(r.type).toLowerCase()} · ${esc(r.year)}`;
			return `				<li><a class="release-more-card" href="/music/${esc(r.slug)}/" aria-label="${esc(r.title)} (${eyebrow})">
					<img src="${esc(r.cover)}" alt="${esc(r.title)} cover" width="400" height="400" loading="lazy">
					<span class="release-more-meta">
						<span class="release-more-title">${esc(r.title)}</span>
						<span class="release-more-eyebrow">${eyebrow}</span>
					</span>
				</a></li>`;
		})
		.join('\n');

	return `
		<section class="release-more" aria-label="more music from gravemint">
			<h2 class="release-about-heading">more music</h2>
			<ul class="release-more-list">
${items}
			</ul>
		</section>
`;
}

function buildArtHtml(release, gallery) {
	if (isPreSave(release) && isPlaceholderCover(release)) {
		return buildPreSaveArtHtml(release);
	}

	const galleryJson = JSON.stringify(gallery);
	const hasMultiple = gallery.length > 1;
	const iconClass = hasMultiple ? 'fa-solid fa-images' : 'fa-solid fa-magnifying-glass-plus';
	const label = hasMultiple
		? `view gallery for ${release.title}`
		: `view full cover art for ${release.title}`;

	return `			<div class="release-hero-art-col">
				<button type="button" class="release-hero-art-wrap release-art-open" data-art-gallery="${esc(galleryJson)}" aria-label="${esc(label)}">
					<img class="release-hero-art" src="${esc(release.cover)}" alt="${esc(release.title)} cover art" width="800" height="800" fetchpriority="high">
					<span class="release-art-zoom" aria-hidden="true">
						<i class="${iconClass}"></i>
					</span>
				</button>
${buildArtMetaHtml(release)}			</div>`;
}

function buildPage(release) {
	const url = `${data.site}/music/${release.slug}/`;
	const title = releaseTitle(release);
	const gallery = resolveGallery(release);
	const ogImage = resolveOgImage(release, gallery);
	const ogDims = ogImageDimensions(release, gallery);
	const ogTypeValue = ogType(release);
	const metaDesc = releaseMetaDescription(release);
	const longDesc = releaseLongDescription(release);
	const releaseDate = releaseDatePublished(release);
	const themeColor = data.seo?.themeColor || '#060606';
	const musicianUrl = `${data.site}/#musicgroup`;
	const preSave = isPreSave(release);
	const linksHeading = preSave ? 'pre-save' : 'listen';
	const linksAriaLabel = preSave ? 'pre-save links' : 'streaming and purchase links';

	const primaryHtml = preSave
		? buildPreSaveLinksHtml(release)
		: buildPlatformLinksHtml(release, primaryPlatforms);
	const moreHtml = preSave ? '' : buildPlatformLinksHtml(release, morePlatforms);

	const moreListId = `release-more-platforms-${release.slug}`;
	const headerHtml = moreHtml
		? `				<header class="release-hero-links-head">
					<h2 class="platform-heading">${esc(linksHeading)}</h2>
					<button type="button" class="platform-more-toggle" aria-expanded="true" aria-controls="${esc(moreListId)}" data-platform-more hidden>
						<span class="visually-hidden">show more platforms</span>
						<span class="platform-more-plus" aria-hidden="true"></span>
					</button>
				</header>`
		: `				<h2 class="platform-heading">${esc(linksHeading)}</h2>`;

	const moreSection = moreHtml
		? `				<ul id="${esc(moreListId)}" class="platform-list platform-grid platform-grid--more" data-platform-more-list>
${moreHtml}
				</ul>
`
		: '';

	const schemaGraph = {
		'@context': 'https://schema.org',
		'@graph': [buildBreadcrumb(url, release), buildReleaseSchema(release, url, ogImage, gallery)],
	};
	const lightboxHtml = preSave && isPlaceholderCover(release)
		? ''
		: `
	<div class="art-lightbox" hidden aria-hidden="true">
		<div class="art-lightbox-backdrop" data-art-close tabindex="-1"></div>
		<div class="art-lightbox-dialog" role="dialog" aria-modal="true" aria-label="cover art">
			<button type="button" class="art-lightbox-close" data-art-close aria-label="close">×</button>
			<button type="button" class="art-lightbox-nav art-lightbox-prev" data-art-prev aria-label="previous image" hidden>
				<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
			</button>
			<div class="art-lightbox-frame">
				<img class="art-lightbox-img" src="" alt="">
			</div>
			<button type="button" class="art-lightbox-nav art-lightbox-next" data-art-next aria-label="next image" hidden>
				<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
			</button>
			<div class="art-lightbox-counter" data-art-counter aria-live="polite" hidden></div>
		</div>
	</div>`;

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
	<meta property="og:site_name" content="${esc(data.artist)}">
	<meta property="og:title" content="${esc(release.title)} by gravemint">
	<meta property="og:description" content="${esc(metaDesc)}">
	<meta property="og:url" content="${esc(url)}">
	<meta property="og:image" content="${esc(ogImage)}">
	<meta property="og:image:type" content="${esc(ogImageType(ogImage.replace(data.site, '')))}">
	<meta property="og:image:width" content="${ogDims.width}">
	<meta property="og:image:height" content="${ogDims.height}">
	<meta property="og:image:alt" content="${esc(release.title)} cover art by gravemint">
	<meta property="music:musician" content="${esc(musicianUrl)}">
	${releaseDate ? `<meta property="music:release_date" content="${esc(releaseDate)}">\n\t` : ''}<meta name="twitter:card" content="summary_large_image">
${twitterMetaHtml()}	<meta name="twitter:title" content="${esc(release.title)} by gravemint">
	<meta name="twitter:description" content="${esc(metaDesc)}">
	<meta name="twitter:image" content="${esc(ogImage)}">
	<meta name="twitter:image:alt" content="${esc(release.title)} cover art by gravemint">
	<link rel="icon" href="/favicon.ico" sizes="any">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
	<link rel="manifest" href="/manifest.json">
	<link rel="preconnect" href="https://open.spotify.com" crossorigin>
	<link rel="preconnect" href="https://embed-cdn.spotifycdn.com" crossorigin>
	<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
	<link rel="preload" as="style" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" crossorigin="anonymous" onload="this.onload=null;this.rel='stylesheet'">
	<noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" crossorigin="anonymous"></noscript>
	<link href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@300;400&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="/style.css">
	<link rel="stylesheet" href="/release.css">
	<script type="application/ld+json">
${JSON.stringify(schemaGraph, null, '\t')}
	</script>
</head>
<body class="release-page${preSave ? ' release-page--presave' : ''}">
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
${buildArtHtml(release, gallery)}
${buildHeroStageHtml(release)}
			<aside class="release-hero-links" aria-label="${esc(linksAriaLabel)}">
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
` : ''}${buildMoreMusicHtml(release)}	</main>
${lightboxHtml}

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

function buildLlmsTxt() {
	const releaseLines = data.releases
		.map((r) => {
			const eyebrow = `${String(r.type).toLowerCase()}, ${r.year}`;
			const desc = r.metaDescription || '';
			return `- [${r.title} (${eyebrow})](${data.site}/music/${r.slug}/): ${desc}`;
		})
		.join('\n');

	const platformLinks = (data.sameAs || [])
		.map((url) => `- ${url}`)
		.join('\n');

	return `# gravemint

> michigan-based electronic music artist since 2017. ethereal, melodically driven sounds exploring solitude, memory, atmosphere, and place

extended documentation: ${data.site}/llms-full.txt

## discography

${releaseLines}

## listen

${platformLinks}

## site

- [home](${data.site}/)
- [all music](${data.site}/#music)
- [about](${data.site}/#about)
`;
}

function buildLlmsFullTxt() {
	const aboutParagraphs = (data.seo?.llmsAbout || [])
		.map((p) => p.trim())
		.filter(Boolean)
		.join('\n\n');

	const releaseSections = data.releases
		.map((r) => {
			const eyebrow = `${String(r.type).toLowerCase()}, ${r.year}`;
			const url = `${data.site}/music/${r.slug}/`;
			const meta = r.metaDescription || '';
			const long = r.longDescription || r.description || '';
			const tracks =
				Array.isArray(r.tracks) && r.tracks.length
					? `\n\ntracks:\n${r.tracks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
					: '';
			const links = r.links
				? `\n\nlisten:\n${Object.entries(r.links)
						.filter(([, href]) => href)
						.map(([key, href]) => `- ${key}: ${href}`)
						.join('\n')}`
				: '';

			return `### ${r.title} (${eyebrow})

${url}

${meta}

${long}${tracks}${links}`;
		})
		.join('\n\n');

	const platformLinks = (data.sameAs || [])
		.map((url) => `- ${url}`)
		.join('\n');

	return `# gravemint

> michigan-based electronic music artist since 2017. ethereal, melodically driven sounds exploring solitude, memory, atmosphere, and place

short summary: ${data.site}/llms.txt

## about

${aboutParagraphs}

## discography

${releaseSections}

## listen

${platformLinks}

## site

- [home](${data.site}/)
- [all music](${data.site}/#music)
- [about](${data.site}/#about)
`;
}

fs.writeFileSync(path.join(root, 'llms.txt'), buildLlmsTxt());
console.log('updated llms.txt');
fs.writeFileSync(path.join(root, 'llms-full.txt'), buildLlmsFullTxt());
console.log('updated llms-full.txt');

function resolveHomeHeroRelease() {
	const hero = data.homeHero || { mode: 'featured', slug: 'vicarious-solitude' };
	const fallbackSlug = hero.fallbackSlug || 'vicarious-solitude';

	if (hero.mode === 'presave') {
		let release;
		if (hero.slug) {
			release = data.releases.find((r) => r.slug === hero.slug);
			if (release && !isPreSave(release)) {
				console.warn(`homeHero.slug "${hero.slug}" is not a pre-save release`);
				release = undefined;
			} else if (!release) {
				console.warn(`homeHero.slug "${hero.slug}" not found`);
			}
		} else {
			release = data.releases.find(isPreSave);
		}
		if (release) return { release, mode: 'presave' };
		console.warn('homeHero mode presave but no active pre-save; using featured fallback');
	}

	const slug = hero.mode === 'featured' ? hero.slug || fallbackSlug : fallbackSlug;
	const release = data.releases.find((r) => r.slug === slug);
	if (!release) {
		throw new Error(`homeHero featured slug "${slug}" not found in releases`);
	}
	return { release, mode: 'featured' };
}

function preSaveHubUrl(release) {
	return release.preSaveHub || release.links?.spotify || null;
}

function buildHomeHeroHtml() {
	const { release, mode } = resolveHomeHeroRelease();
	const href = `/music/${release.slug}/`;
	const title = esc(release.title);
	if (mode === 'presave') {
		const hub = preSaveHubUrl(release);
		if (!hub) {
			console.warn(`homeHero pre-save for "${release.slug}" has no preSaveHub; linking to release page`);
		}
		const presaveHref = hub || href;
		const external = hub
			? ' target="_blank" rel="noopener noreferrer"'
			: '';
		return `\t\t\t<!-- home-hero-start -->
			<a class="release-link release-link--presave" href="${esc(presaveHref)}"${external}>
				<span class="release-eyebrow">pre-save</span>
				<span class="release-title">${title}</span>
			</a>
\t\t\t<!-- home-hero-end -->`;
	}
	const embedAttr = release.spotifyAlbumId
		? ` data-spotify-embed="${esc(spotifyEmbedUrl(release.spotifyAlbumId))}"`
		: '';
	return `\t\t\t<!-- home-hero-start -->
			<a class="release-link" href="${esc(href)}"${embedAttr}>
				<span class="release-eyebrow">featured music</span>
				<span class="release-title">${title}</span>
			</a>
\t\t\t<!-- home-hero-end -->`;
}

function syncIndexHero() {
	const indexPath = path.join(root, 'index.html');
	let html = fs.readFileSync(indexPath, 'utf8');
	const block = buildHomeHeroHtml();
	const pattern = /\t\t\t<!-- home-hero-start -->[\s\S]*?\t\t\t<!-- home-hero-end -->/;
	if (!pattern.test(html)) {
		console.warn('index.html missing home-hero markers; skipping hero sync');
		return;
	}
	html = html.replace(pattern, block);
	fs.writeFileSync(indexPath, html);
	console.log('updated index.html home hero');
}

function syncIndexEmbedHints() {
	const indexPath = path.join(root, 'index.html');
	let html = fs.readFileSync(indexPath, 'utf8');

	for (const release of data.releases) {
		if (!release.spotifyAlbumId) continue;
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

function buildCatalogCardHtml(release) {
	const href = `/music/${release.slug}/`;
	const src = release.cover.replace(/^\//, '');
	const preSave = isPreSave(release);
	const cardClass = preSave ? 'release-card release-card--presave' : 'release-card';
	const embedAttr = release.spotifyAlbumId
		? ` data-spotify-embed="${esc(spotifyEmbedUrl(release.spotifyAlbumId))}"`
		: '';
	const badge = preSave
		? `\n\t\t\t\t\t<span class="release-card-badge">pre-save</span>`
		: '';

	return `\t\t\t\t<li>
\t\t\t\t\t<a class="${cardClass}" href="${esc(href)}"${embedAttr}>
\t\t\t\t\t\t<span class="release-card-art-wrap">
\t\t\t\t\t\t\t<img class="release-card-art" src="${esc(src)}" alt="${esc(release.title)} cover art" width="800" height="800" loading="lazy">
\t\t\t\t\t\t</span>
\t\t\t\t\t\t<span class="release-card-title">${esc(release.title)}</span>${badge}
\t\t\t\t\t</a>
\t\t\t\t</li>`;
}

function syncIndexCatalog() {
	const indexPath = path.join(root, 'index.html');
	let html = fs.readFileSync(indexPath, 'utf8');
	const items = data.releases.map(buildCatalogCardHtml).join('\n');
	const pattern = /(<ul class="release-catalog">)[\s\S]*?(<\/ul>)/;

	if (!pattern.test(html)) {
		console.warn('index.html missing release-catalog; skipping catalog sync');
		return;
	}

	html = html.replace(pattern, `$1\n${items}\n\t\t\t$2`);
	fs.writeFileSync(indexPath, html);
	console.log('updated index.html catalog');
}

function buildSiteNavigationSchema() {
	const site = data.site;
	const items = [
		{ id: 'about', name: 'about', url: `${site}/#about` },
		{ id: 'music', name: 'music', url: `${site}/#music` },
		...data.releases.map((release) => ({
			id: release.slug,
			name: release.title,
			url: `${site}/music/${release.slug}/`,
		})),
	];
	return items.map((item, index) => ({
		'@type': 'SiteNavigationElement',
		'@id': `${site}/#nav-${item.id}`,
		position: index + 1,
		name: item.name,
		url: item.url,
	}));
}

function buildHomeSchema() {
	const seo = data.seo || {};
	const sameAs = data.sameAs || [];
	const person = data.person;
	const site = data.site;
	const discography = data.releases.map((release, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: release.title,
		url: `${site}/music/${release.slug}/`,
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
			...siteBrandImageRights(),
		},
		image: { '@id': `${data.site}/#logo` },
		sameAs,
	};

	const homeOgPath = seo.homeOgImage || '/images/site/home-og.jpg';
	const homeOgImage = {
		'@type': 'ImageObject',
		'@id': `${site}/#home-og`,
		contentUrl: `${site}${homeOgPath}`,
		url: `${site}${homeOgPath}`,
		name: `${data.artist} electronic music artist`,
		description: seo.ogDescription || seo.homeDescription,
		width: 1200,
		height: 630,
		...siteBrandImageRights(),
	};

	const graph = [
		{
			'@type': 'WebSite',
			'@id': `${site}/#website`,
			url: `${site}/`,
			name: data.artist,
			description: seo.homeDescription,
			inLanguage: 'en-US',
			publisher: { '@id': `${site}/#musicgroup` },
			mainEntity: { '@id': `${site}/#musicgroup` },
			hasPart: { '@id': `${site}/#discography` },
			image: { '@id': `${site}/#home-og` },
		},
		homeOgImage,
		{
			'@type': 'WebPage',
			'@id': `${site}/#webpage`,
			url: `${site}/`,
			name: data.artist,
			description: seo.homeDescription,
			isPartOf: { '@id': `${site}/#website` },
			about: { '@id': `${site}/#musicgroup` },
			primaryImageOfPage: { '@id': `${site}/#home-og` },
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
		'@id': `${site}/#discography`,
		name: `${data.artist} discography`,
		numberOfItems: discography.length,
		itemListElement: discography,
	});
	graph.push(...buildSiteNavigationSchema());

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
	<meta name="application-name" content="${esc(data.artist)}">
	<meta name="description" content="${esc(seo.homeDescription)}">
	<link rel="canonical" href="${esc(site)}/">
	<meta property="og:locale" content="en_US">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="${esc(data.artist)}">
	<meta property="og:title" content="${esc(seo.ogTitle)}">
	<meta property="og:description" content="${esc(seo.ogDescription)}">
	<meta property="og:url" content="${esc(site)}/">
	<meta property="og:image" content="${esc(site)}${esc(seo.homeOgImage || '/images/site/home-og.jpg')}">
	<meta property="og:image:type" content="image/jpeg">
	<meta property="og:image:width" content="1200">
	<meta property="og:image:height" content="630">
	<meta property="og:image:alt" content="gravemint electronic music artist">
	<meta name="twitter:card" content="summary_large_image">
${twitterMetaHtml()}	<meta name="twitter:title" content="${esc(seo.ogTitle)}">
	<meta name="twitter:description" content="${esc(seo.ogDescription)}">
	<meta name="twitter:image" content="${esc(site)}${esc(seo.homeOgImage || '/images/site/home-og.jpg')}">
	<meta name="twitter:image:alt" content="gravemint electronic music artist">
	<link rel="icon" href="/favicon.ico" sizes="any">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
	<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
	<link rel="manifest" href="/manifest.json">
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

syncIndexHero();
syncIndexEmbedHints();
syncIndexCatalog();
syncIndexSeo();
