(function () {
	'use strict';

	document.querySelectorAll('[data-platform-more]').forEach((btn) => {
		const targetId = btn.getAttribute('aria-controls');
		const target = targetId ? document.getElementById(targetId) : null;
		if (!target) return;

		btn.hidden = false;
		btn.setAttribute('aria-expanded', 'false');
		target.hidden = true;

		btn.addEventListener('click', () => {
			const expanded = btn.getAttribute('aria-expanded') === 'true';
			btn.setAttribute('aria-expanded', String(!expanded));
			target.hidden = expanded;
		});
	});

	const lightbox = document.querySelector('.art-lightbox');
	const lightboxImg = lightbox?.querySelector('.art-lightbox-img');
	const prevBtn = lightbox?.querySelector('[data-art-prev]');
	const nextBtn = lightbox?.querySelector('[data-art-next]');
	const counter = lightbox?.querySelector('[data-art-counter]');
	const artOpen = document.querySelector('.release-art-open');
	let lastFocus = null;
	let currentGallery = [];
	let currentIndex = 0;

	function preloadNeighbors() {
		if (currentGallery.length < 2) return;
		const next = currentGallery[(currentIndex + 1) % currentGallery.length];
		const prev = currentGallery[(currentIndex - 1 + currentGallery.length) % currentGallery.length];
		[next, prev].forEach((item) => {
			if (!item) return;
			const img = new Image();
			img.src = item.src;
		});
	}

	function renderImage() {
		if (!lightboxImg || !currentGallery.length) return;
		const item = currentGallery[currentIndex];
		lightboxImg.src = item.src;
		lightboxImg.alt = item.alt || '';

		const multi = currentGallery.length > 1;
		if (prevBtn) prevBtn.hidden = !multi;
		if (nextBtn) nextBtn.hidden = !multi;
		if (counter) {
			counter.hidden = !multi;
			counter.textContent = multi ? `${currentIndex + 1} / ${currentGallery.length}` : '';
		}

		preloadNeighbors();
	}

	function showNext() {
		if (!currentGallery.length) return;
		currentIndex = (currentIndex + 1) % currentGallery.length;
		renderImage();
	}

	function showPrev() {
		if (!currentGallery.length) return;
		currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
		renderImage();
	}

	function openLightbox(gallery, startIndex = 0) {
		if (!lightbox || !lightboxImg || !gallery.length) return;

		currentGallery = gallery;
		currentIndex = Math.max(0, Math.min(startIndex, gallery.length - 1));
		lastFocus = document.activeElement;
		renderImage();
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
		currentGallery = [];
		currentIndex = 0;
		if (lastFocus && typeof lastFocus.focus === 'function') {
			lastFocus.focus();
		}
	}

	if (artOpen && lightbox) {
		artOpen.addEventListener('click', () => {
			const raw = artOpen.dataset.artGallery;
			if (!raw) return;
			try {
				const gallery = JSON.parse(raw);
				if (Array.isArray(gallery) && gallery.length) {
					openLightbox(gallery, 0);
				}
			} catch (err) {
				console.warn('failed to parse gallery data', err);
			}
		});

		lightbox.querySelectorAll('[data-art-close]').forEach((el) => {
			el.addEventListener('click', closeLightbox);
		});

		prevBtn?.addEventListener('click', showPrev);
		nextBtn?.addEventListener('click', showNext);

		document.addEventListener('keydown', (e) => {
			if (lightbox.hidden) return;
			if (e.key === 'Escape') {
				closeLightbox();
			} else if (e.key === 'ArrowRight') {
				showNext();
			} else if (e.key === 'ArrowLeft') {
				showPrev();
			}
		});

		let touchStartX = null;
		let touchStartY = null;
		lightbox.addEventListener('touchstart', (e) => {
			if (lightbox.hidden) return;
			const t = e.changedTouches[0];
			touchStartX = t.clientX;
			touchStartY = t.clientY;
		}, { passive: true });
		lightbox.addEventListener('touchend', (e) => {
			if (lightbox.hidden || touchStartX === null) return;
			const t = e.changedTouches[0];
			const dx = t.clientX - touchStartX;
			const dy = t.clientY - touchStartY;
			touchStartX = null;
			touchStartY = null;
			if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
				if (dx < 0) showNext();
				else showPrev();
			}
		}, { passive: true });
	}
})();
