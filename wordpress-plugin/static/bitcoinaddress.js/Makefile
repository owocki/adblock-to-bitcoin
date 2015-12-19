#
# Makefile commands how to orchestrate the development
#


# Where do your NPM provided scripts are
BIN=node_modules/.bin

# Which files (.js, .min.js. debug.js) browserify generates
BUNDLE_BASE=dist/bitcoinaddress-bundle

all: clean test distribution site

# What we need to test and build distro
setup:
	npm install .

clean:
	rm dist/* > /dev/null

# Build QRCode + bitcoinaddress combo in UMD boilerplate wrapped distributable .Jjs bundle
# Debug version comes with source maps.
# https://github.com/umdjs/umd
bundle:
	$(BIN)/browserify --standalone bitcoinaddress --debug bitcoinaddress.js --outfile $(BUNDLE_BASE).debug.js
	$(BIN)/browserify --standalone bitcoinaddress --debug bitcoinaddress.js --outfile $(BUNDLE_BASE).js

# Run a development server which automatically rebuilds bundle when .js files are changed
demo-server:
	echo "Visit http://localhost:8000"
	$(BIN)/beefy --live demo.js:dist/demo.js 8000 -- --debug

# Run a development server for unit tests
# Generates new test bundle js file,
# serves dummy HTML wrapper test-local.html which can be opened
# locally in a browser.
# We also pass in brfs transformation which allows reading
# local files on the compilation time.
test-server:
	echo "Visit http://localhost:8000/test-local.html"
	$(BIN)/beefy --live test.js:dist/test-bundle.js 8000 -- --debug

# Builds minified version and updates runnable demo
# for Github pages and index.html
distribution: bundle
	$(BIN)/uglifyjs $(BUNDLE_BASE).js > $(BUNDLE_BASE).min.js
	$(BIN)/browserify demo.js --outfile dist/demo.js

# Run tests locally using testling command and PhantomJS headless browser
# XXX: How to get testling local command to run properly on OSX?
# Could not manage to get this working.
test:
	$(BIN)/browserify test.js | $(BIN)/testling

# Publish an NPM package
publish:
	echo "Just run $(BIN)/npm-release <newversion>"

# Update the Github website
# Make sure you don't have uncommited changes
site: distribution
	git add dist/*
	git push origin master:gh-pages