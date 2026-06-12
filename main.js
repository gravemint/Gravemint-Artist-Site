(function () {
	'use strict';

	function isChrome() {
		if (navigator.userAgentData?.brands) {
			const brands = navigator.userAgentData.brands.map((b) => b.brand);
			return (
				brands.includes('Google Chrome') &&
				!brands.includes('Microsoft Edge') &&
				!brands.includes('Opera')
			);
		}
		const ua = navigator.userAgent;
		return /Chrome|CriOS/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);
	}

	const chrome = isChrome();
	if (chrome) {
		document.documentElement.classList.add('is-chrome');
	}

	function initChromeReleaseEmbeds() {
		if (!chrome) return;
		document.querySelectorAll('body.release-page .embed-wrap').forEach((wrap) => {
			wrap.addEventListener(
				'click',
				() => {
					document.querySelectorAll('body.release-page .embed-wrap.is-embed-active').forEach((other) => {
						if (other !== wrap) other.classList.remove('is-embed-active');
					});
					wrap.classList.add('is-embed-active');
				},
				true
			);
		});
		document.addEventListener('click', (e) => {
			if (e.target.closest('body.release-page .embed-wrap')) return;
			document.querySelectorAll('body.release-page .embed-wrap.is-embed-active').forEach((wrap) => {
				wrap.classList.remove('is-embed-active');
			});
		});
	}

	initChromeReleaseEmbeds();

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const canvas = document.getElementById('ghost-canvas');
	const navLinks = document.querySelectorAll('.side-nav a[data-section]');
	const sections = Array.from(document.querySelectorAll('main [data-section]'));
	const hasSections = sections.length > 0;

	let activeSection = 'home';

	function setActiveSection(id) {
		if (id === activeSection) return;
		activeSection = id;
		navLinks.forEach((link) => {
			link.classList.toggle('is-active', link.dataset.section === id);
		});
	}

	function updateNavDock() {
		const about = document.getElementById('about');
		const nav = document.querySelector('.side-nav');
		if (!about || !nav) return;

		const aboutTop = about.getBoundingClientRect().top;
		const dock = aboutTop <= window.innerHeight * 0.92;
		nav.classList.toggle('side-nav--dock', dock);
	}

	function updateActiveSection() {
		if (!hasSections) return;
		const line = window.scrollY + window.innerHeight * 0.35;
		let id = sections[0].dataset.section;

		sections.forEach((section) => {
			if (sectionDocTop(section) <= line) {
				id = section.dataset.section;
			}
		});

		setActiveSection(id);
		updateNavDock();
	}

	function sectionDocTop(section) {
		return section.getBoundingClientRect().top + window.scrollY;
	}

	let scrollTicking = false;
	function onScroll() {
		if (!hasSections) return;
		if (scrollTicking) return;
		scrollTicking = true;
		requestAnimationFrame(() => {
			updateActiveSection();
			scrollTicking = false;
		});
	}

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', updateActiveSection);
	window.addEventListener('hashchange', updateActiveSection);

	if (hasSections) {
		navLinks.forEach((link) => {
			link.addEventListener('click', () => {
				const id = link.dataset.section;
				if (id) setActiveSection(id);
				link.blur();
				setTimeout(updateActiveSection, 400);
				setTimeout(updateActiveSection, 900);
			});
		});

		updateActiveSection();
		updateNavDock();
	}

	const embedWraps = document.querySelectorAll('.embed-wrap');
	const canHover =
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(hover: hover)').matches;
	let embedHoverActive = false;
	let lastPointer = { x: -1, y: -1 };

	function pointInRect(x, y, rect) {
		return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
	}

	function updateEmbedHover(clientX, clientY) {
		if (!canHover) return;
		if (clientX >= 0) {
			lastPointer.x = clientX;
			lastPointer.y = clientY;
		}

		let hovered = null;
		embedWraps.forEach((wrap) => {
			if (pointInRect(lastPointer.x, lastPointer.y, wrap.getBoundingClientRect())) {
				hovered = wrap;
			}
		});

		embedHoverActive = !!hovered;
		embedWraps.forEach((wrap) => {
			wrap.classList.toggle('is-embed-hover', wrap === hovered);
		});
	}

	function clearEmbedHover() {
		if (!canHover) return;
		embedHoverActive = false;
		lastPointer.x = -1;
		lastPointer.y = -1;
		embedWraps.forEach((wrap) => wrap.classList.remove('is-embed-hover'));
	}

	if (canHover && embedWraps.length) {
		window.addEventListener('scroll', () => updateEmbedHover(lastPointer.x, lastPointer.y), {
			passive: true,
		});
		window.addEventListener('resize', () => updateEmbedHover(lastPointer.x, lastPointer.y));
		document.addEventListener('mouseleave', clearEmbedHover);

		embedWraps.forEach((wrap) => {
			wrap.addEventListener('mouseenter', () => {
				embedHoverActive = true;
				embedWraps.forEach((w) => w.classList.toggle('is-embed-hover', w === wrap));
			});
			wrap.addEventListener('mouseleave', () => {
				requestAnimationFrame(() => updateEmbedHover(lastPointer.x, lastPointer.y));
			});
		});
	}

	initSpotifyEmbedWarm();

	function initSpotifyEmbedWarm() {
		const links = document.querySelectorAll(
			'a.release-card[data-spotify-embed], a.release-link[data-spotify-embed]'
		);
		if (!links.length) return;

		const warmed = new Set();
		let warmFrame = null;

		function warmEmbed(url) {
			if (!url || warmed.has(url)) return;
			warmed.add(url);
			warmFrame?.remove();
			warmFrame = document.createElement('iframe');
			warmFrame.src = url;
			warmFrame.tabIndex = -1;
			warmFrame.setAttribute('aria-hidden', 'true');
			warmFrame.title = '';
			Object.assign(warmFrame.style, {
				position: 'absolute',
				width: '0',
				height: '0',
				border: '0',
				opacity: '0',
				pointerEvents: 'none',
				visibility: 'hidden',
			});
			document.body.appendChild(warmFrame);
		}

		links.forEach((link) => {
			const url = link.dataset.spotifyEmbed;
			const intent = () => warmEmbed(url);
			link.addEventListener('pointerenter', intent, { passive: true });
			link.addEventListener('touchstart', intent, { passive: true });
		});

		const runIdle = (fn) => {
			if ('requestIdleCallback' in window) {
				requestIdleCallback(fn, { timeout: 4000 });
			} else {
				setTimeout(fn, 2000);
			}
		};

		runIdle(() => {
			const featured = document.querySelector('a.release-link[data-spotify-embed]');
			if (featured) warmEmbed(featured.dataset.spotifyEmbed);
		});
	}

	if (window.location.hash) {
		const target = document.querySelector(window.location.hash);
		if (target) {
			requestAnimationFrame(() =>
				target.scrollIntoView({ behavior: reducedMotion || chrome ? 'auto' : 'smooth' })
			);
		}
		setTimeout(updateActiveSection, 100);
	}

	function isPointerEffectDevice() {
		return (
			window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 52.01rem)')
				.matches && navigator.maxTouchPoints === 0
		);
	}

	if (reducedMotion || !canvas || !isPointerEffectDevice()) {
		if (canvas) canvas.style.display = 'none';
		return;
	}

	const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
	let width = 0;
	let height = 0;
	let pointer = { x: -9999, y: -9999, active: false };
	let smooth = { x: -9999, y: -9999 };
	const particles = [];
	// chrome’s canvas path is slower on integrated-gpu macbooks; safari uses a lighter compositor
	const chromeLiteCanvas = chrome;
	const maxParticles = chromeLiteCanvas ? 48 : 110;
	let lastScrollY = window.scrollY;
	let lastSpawn = 0;
	let rafId = 0;
	let canvasPaused = false;
	let scrollEndTimer = 0;

	function pauseCanvasForScroll() {
		const dy = Math.abs(window.scrollY - lastScrollY);
		lastScrollY = window.scrollY;
		if (dy < 2) return;

		if (!canvasPaused) {
			canvasPaused = true;
			cancelAnimationFrame(rafId);
			rafId = 0;
			ctx.clearRect(0, 0, width, height);
			particles.length = 0;
		}
		clearTimeout(scrollEndTimer);
		scrollEndTimer = window.setTimeout(resumeCanvasAfterScroll, 150);
	}

	function resumeCanvasAfterScroll() {
		canvasPaused = false;
		if (!document.hidden && !rafId) {
			rafId = requestAnimationFrame(frame);
		}
	}

	if (chrome) {
		window.addEventListener('scroll', pauseCanvasForScroll, { passive: true });
	}

	function resize() {
		lastScrollY = window.scrollY;
		const dpr = chromeLiteCanvas
			? Math.min(window.devicePixelRatio || 1, 1.25)
			: Math.min(window.devicePixelRatio || 1, 2);
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		updateActiveSection();
	}

	function spawnParticle(x, y, opts = {}) {
		particles.push({
			x: x + (Math.random() - 0.5) * 12,
			y: y + (Math.random() - 0.5) * 12,
			vx: (Math.random() - 0.5) * 0.6,
			vy: -0.25 - Math.random() * 0.7,
			life: opts.life ?? 1,
			size: opts.size ?? 1 + Math.random() * 3,
			twinkle: Math.random() * Math.PI * 2,
		});
		if (particles.length > maxParticles) {
			particles.splice(0, particles.length - maxParticles);
		}
	}

	function clearPointer() {
		pointer.active = false;
		pointer.x = -9999;
		pointer.y = -9999;
		smooth.x = -9999;
		smooth.y = -9999;
		particles.length = 0;
	}

	function setPointer(clientX, clientY) {
		updateEmbedHover(clientX, clientY);
		if (embedHoverActive) {
			pointer.active = false;
			return;
		}

		pointer.x = clientX;
		pointer.y = clientY;
		pointer.active = true;
	}

	window.addEventListener('resize', resize);
	if (window.visualViewport) {
		window.visualViewport.addEventListener('resize', resize);
	}
	window.addEventListener('mousemove', (e) => {
		if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= width - 1 || e.clientY >= height - 1) {
			clearPointer();
			return;
		}
		setPointer(e.clientX, e.clientY);
	});
	document.addEventListener('mouseleave', clearPointer);
	window.addEventListener('blur', clearPointer);

	resize();

	function drawCursorSparkle(t, x, y) {
		const pulse = 0.85 + 0.15 * Math.sin(t * 6);
		const layers = chromeLiteCanvas ? 1 : 3;
		const sparkles = chromeLiteCanvas ? 3 : 5;

		ctx.save();
		if (!chromeLiteCanvas) ctx.filter = 'blur(12px)';
		ctx.globalCompositeOperation = chromeLiteCanvas ? 'screen' : 'lighter';

		for (let layer = 0; layer < layers; layer++) {
			const r = (18 + layer * 14) * pulse;
			const g = ctx.createRadialGradient(x, y, 0, x, y, r);
			g.addColorStop(0, `rgba(255, 255, 255, ${0.28 - layer * 0.06})`);
			g.addColorStop(0.5, `rgba(220, 240, 255, ${0.12 - layer * 0.03})`);
			g.addColorStop(1, 'rgba(200, 220, 255, 0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();

		ctx.save();
		ctx.globalCompositeOperation = chromeLiteCanvas ? 'screen' : 'lighter';
		for (let i = 0; i < sparkles; i++) {
			const angle = t * 3 + i * 1.4;
			const dist = 8 + Math.sin(t * 4 + i) * 4;
			const sx = x + Math.cos(angle) * dist;
			const sy = y + Math.sin(angle) * dist;
			const tw = 0.5 + 0.5 * Math.sin(t * 12 + i);
			ctx.fillStyle = `rgba(255, 255, 255, ${tw * 0.7})`;
			ctx.beginPath();
			ctx.arc(sx, sy, 0.8 + tw * 0.6, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	function drawParticles(time) {
		const t = time * 0.001;
		const followRate = pointer.active ? 0.42 : 0.22;
		smooth.x += (pointer.x - smooth.x) * followRate;
		smooth.y += (pointer.y - smooth.y) * followRate;

		const cursorAlive = !embedHoverActive && pointer.active;
		const spawnChance = chromeLiteCanvas ? 0.32 : 0.5;
		const driftChance = chromeLiteCanvas ? 0.14 : 0.22;

		if (pointer.active && !embedHoverActive) {
			const now = performance.now();
			if (now - lastSpawn > (chromeLiteCanvas ? 22 : 14)) {
				lastSpawn = now;
				spawnParticle(pointer.x, pointer.y);
				if (Math.random() > 0.35) spawnParticle(pointer.x, pointer.y);
			}
		}

		if (pointer.active && !embedHoverActive && Math.random() < spawnChance) {
			spawnParticle(smooth.x, smooth.y, { size: 1.2 + Math.random() * 2.5 });
		} else if (cursorAlive && Math.random() < driftChance) {
			spawnParticle(smooth.x, smooth.y, { size: 0.8 + Math.random() * 1.8, life: 0.85 });
		}

		const trailDecay = embedHoverActive ? 0.06 : 0.034;

		ctx.clearRect(0, 0, width, height);
		ctx.globalCompositeOperation = chromeLiteCanvas ? 'screen' : 'lighter';

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= trailDecay;
			p.x += p.vx + Math.sin(t * 2.5 + p.twinkle) * 0.15;
			p.y += p.vy;

			if (p.life <= 0) {
				particles.splice(i, 1);
				continue;
			}

			const twinkle = 0.5 + 0.5 * Math.sin(t * 11 + p.twinkle);
			const alpha = p.life * p.life * twinkle * 0.85;
			const r = p.size * (0.55 + p.life * 0.9);

			ctx.save();
			if (!chromeLiteCanvas) ctx.filter = `blur(${2 + (1 - p.life) * 4}px)`;
			const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.8);
			g.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
			g.addColorStop(0.35, `rgba(235, 248, 255, ${alpha * 0.45})`);
			g.addColorStop(1, 'rgba(210, 225, 255, 0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();

			if (twinkle > 0.88 && p.life > 0.25) {
				ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		if (cursorAlive && smooth.x > -1000) {
			drawCursorSparkle(t, smooth.x, smooth.y);
		}

		ctx.globalCompositeOperation = 'source-over';
	}

	function frame(time) {
		if (canvasPaused) {
			rafId = 0;
			return;
		}
		drawParticles(time);
		rafId = requestAnimationFrame(frame);
	}

	rafId = requestAnimationFrame(frame);

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		} else if (!canvasPaused) {
			rafId = requestAnimationFrame(frame);
		}
	});
})();
