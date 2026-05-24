(function () {
	'use strict';

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
				target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
			);
		}
		setTimeout(updateActiveSection, 100);
	}

	function isPointerEffectDevice() {
		return (
			window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
			navigator.maxTouchPoints === 0
		);
	}

	if (reducedMotion || !canvas || !isPointerEffectDevice()) {
		if (canvas) canvas.style.display = 'none';
		return;
	}

	const ctx = canvas.getContext('2d');
	let width = 0;
	let height = 0;
	let pointer = { x: -9999, y: -9999, active: false };
	let smooth = { x: -9999, y: -9999 };
	const particles = [];
	const maxParticles = 110;
	let lastSpawn = 0;
	let rafId = 0;

	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
		const now = performance.now();
		if (now - lastSpawn > 14) {
			lastSpawn = now;
			spawnParticle(clientX, clientY);
			if (Math.random() > 0.25) spawnParticle(clientX, clientY);
		}
	}

	window.addEventListener('resize', resize);
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

		ctx.save();
		ctx.filter = 'blur(12px)';
		ctx.globalCompositeOperation = 'lighter';

		for (let layer = 0; layer < 3; layer++) {
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
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 5; i++) {
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

		if (pointer.active && !embedHoverActive && Math.random() < 0.5) {
			spawnParticle(smooth.x, smooth.y, { size: 1.2 + Math.random() * 2.5 });
		} else if (cursorAlive && Math.random() < 0.22) {
			spawnParticle(smooth.x, smooth.y, { size: 0.8 + Math.random() * 1.8, life: 0.85 });
		}

		const trailDecay = embedHoverActive ? 0.06 : 0.034;

		ctx.clearRect(0, 0, width, height);
		ctx.globalCompositeOperation = 'lighter';

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
			ctx.filter = `blur(${2 + (1 - p.life) * 4}px)`;
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
		drawParticles(time);
		rafId = requestAnimationFrame(frame);
	}

	rafId = requestAnimationFrame(frame);

	document.addEventListener('visibilitychange', () => {
		if (document.hidden) cancelAnimationFrame(rafId);
		else rafId = requestAnimationFrame(frame);
	});
})();
