(function () {
	'use strict';

	const lightbox = document.querySelector('.art-lightbox');
	const lightboxImg = document.querySelector('.art-lightbox-img');
	const artOpen = document.querySelector('.release-art-open');
	let lastFocus = null;

	function openLightbox(src, alt) {
		if (!lightbox || !lightboxImg) return;

		lastFocus = document.activeElement;
		lightboxImg.src = src;
		lightboxImg.alt = alt;
		lightbox.hidden = false;
		lightbox.setAttribute('aria-hidden', 'false');
		document.body.style.overflow = 'hidden';
		lightbox.querySelector('.art-lightbox-close')?.focus();
	}

	function closeLightbox() {
		if (!lightbox || !lightboxImg) return;

		lightbox.hidden = true;
		lightbox.setAttribute('aria-hidden', 'true');
		lightboxImg.removeAttribute('src');
		lightboxImg.alt = '';
		document.body.style.overflow = '';
		if (lastFocus && typeof lastFocus.focus === 'function') {
			lastFocus.focus();
		}
	}

	if (artOpen && lightbox) {
		artOpen.addEventListener('click', () => {
			const src = artOpen.dataset.artFull;
			const alt = artOpen.querySelector('img')?.alt ?? 'cover art';
			if (src) openLightbox(src, alt);
		});

		lightbox.querySelectorAll('[data-art-close]').forEach((el) => {
			el.addEventListener('click', closeLightbox);
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && !lightbox.hidden) {
				closeLightbox();
			}
		});
	}
})();
