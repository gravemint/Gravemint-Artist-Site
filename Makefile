# gravemint site build commands
#
# usage:
#   make           # same as `make help`
#   make build     # regenerate every release page, sitemap, and SEO metadata from releases.json
#   make stamp     # write IPTC/XMP copyright + alt-text metadata into every gallery jpg via exiftool
#   make release   # full pipeline: build pages then stamp images (run this after adding art or changing releases.json)
#   make serve     # serve the site locally at http://localhost:8000 for previewing
#   make help      # list all available targets

.PHONY: help build stamp release serve

# show available commands when you just type `make`
help:
	@echo "available targets:"
	@echo "  make build    regenerate html pages, sitemap, and structured data"
	@echo "  make stamp    embed copyright + alt-text metadata into gallery jpgs (requires exiftool)"
	@echo "  make release  run build then stamp (use after adding art or editing releases.json)"
	@echo "  make serve    preview the site locally at http://localhost:8000"

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
serve:
	@echo "serving at http://localhost:8000 (ctrl+c to stop)"
	python3 -m http.server 8000
