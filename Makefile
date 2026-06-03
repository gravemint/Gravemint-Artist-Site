# gravemint site build commands
#
# usage:
#   make           # same as `make help`
#   make build     # regenerate every release page, sitemap, and SEO metadata from releases.json
#   make stamp     # write IPTC/XMP copyright + alt-text metadata into every gallery jpg via exiftool
#   make release   # full pipeline: build pages then stamp images (run this after adding art or changing releases.json)
#   make serve     # serve the site locally at http://localhost:8000 for previewing
#   make lan-url   # print http://192.168.x.x:8000 for testing on a phone (same wifi)
#   make help      # list all available targets

SERVE_PORT ?= 8000

.PHONY: help build stamp release serve lan-url

# show available commands when you just type `make`
help:
	@echo "available targets:"
	@echo "  make build    regenerate html pages, sitemap, and structured data"
	@echo "  make stamp    embed copyright + alt-text metadata into gallery jpgs (requires exiftool)"
	@echo "  make release  run build then stamp (use after adding art or editing releases.json)"
	@echo "  make serve    preview the site locally at http://localhost:$(SERVE_PORT)"
	@echo "  make lan-url  print the lan url for phone testing (run make serve first)"

# regenerate every /music/<slug>/index.html page from releases.json
# also updates sitemap.xml and the spotify embed hints + seo blocks in index.html
build:
	node scripts/build-releases.mjs

# walk every release.gallery entry in releases.json and stamp IPTC/XMP metadata
# (creator, copyright notice, credit line, image description, url) into the jpg files
# requires exiftool: `brew install exiftool`
stamp:
	node scripts/stamp-images.mjs

# typical workflow after dropping new art into images/releases/<slug>/
# or after editing release descriptions, tracklists, or gallery entries in releases.json
release: build stamp

# preview the static site locally using python's built-in http server
# open http://localhost:8000 in a browser, ctrl+c to stop
# binds to all interfaces so phones on the same wifi can connect (see make lan-url)
serve:
	@echo "serving at http://localhost:$(SERVE_PORT) (ctrl+c to stop)"
	@echo "phone on same wifi: run \`make lan-url\` in another terminal"
	python3 -m http.server $(SERVE_PORT) --bind 0.0.0.0

# print the url to open on a phone (same wifi as this machine, with make serve running)
lan-url:
	@port="$(SERVE_PORT)"; \
	ip=""; \
	for iface in en0 en1 en2 bridge0; do \
		candidate=$$(ipconfig getifaddr $$iface 2>/dev/null); \
		if [ -n "$$candidate" ]; then ip="$$candidate"; break; fi; \
	done; \
	if [ -z "$$ip" ]; then \
		ip=$$(ifconfig | awk '/inet / && $$2 != "127.0.0.1" && $$2 !~ /^169\.254\./ {print $$2; exit}'); \
	fi; \
	if [ -z "$$ip" ]; then \
		echo "could not find a lan ip. connect to wifi and try again."; \
		exit 1; \
	fi; \
	echo ""; \
	echo "phone url (same wifi, with make serve running):"; \
	echo "  http://$$ip:$$port/"; \
	echo ""; \
	echo "moss and memory:"; \
	echo "  http://$$ip:$$port/music/moss-and-memory/"; \
	echo ""
