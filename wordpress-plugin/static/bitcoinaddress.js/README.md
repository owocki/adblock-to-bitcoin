
## Introduction

**bitcoinaddress.js** is a a JavaScript component library for making easy bitcoin payments, sending bitcoins and presenting bitcoin addresses on HTML pages.

![image](https://ci.testling.com/miohtama/bitcoinaddress.js.png)

## Features

* Mobile and touch friendly - no pop-ups
* Use [Bitcoin URI protocol](https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki) to make payments from your desktop, web or mobile bitcoin wallet
* Generate QR codes in-fly with JavaScript to make payments from mobile applications
* Copy Bitcoin address to the clipboard
* Customize and extend easily with custom DOM templates and JavaScript hooks

## Demos

[See the demo](http://miohtama.github.com/bitcoinaddress.js/index.html).

* [Liberty Music Store is an online store which allows musicians to sell their songs and receive Bitcoins.](https://libertymusicstore.net/). The source code of Liberty Music Store is [on Github](https://github.com/miohtama/LibertyMusicStore), so you can check it for the integration example.

## Installation

No server-side components needed.

You must have [jQuery](http://jquery.com) (version 1.9 or later) installed.

Drop `bitcoinaddress.js` on your HTML page with optio
 elements as described below.
Download minified or debug bundle from [Github dist folder](https://github.com/miohtama/bitcoinaddress.js/tree/master/dist)
The bundle includes QRCode.js library (see below).

## How it works


* Include `bitcoinaddress.js` on your HTML page
* Configure and initialize it with a `<script>` tag
* Supply a client-side template in a hidden  on your page
* When the HTML page has been loaded, `bitcoinaddress.init()` scans for `.bitcoin-address` CSS classes,
    applies template on them and sets up UI event handlers

Setting up `<script>` tag:


```html
<script src="bitcoinaddress-bundle.min.js"></script>
<script>
    $(document).ready(function() {
        bitcoinaddress.init({

            // jQuery selector defining bitcon addresses on the page
            // needing the boost
            selector: ".bitcoin-address",

            // Id of the DOM template element we use to decorate the addresses.
            // This must contain placefolder .bitcoin-address
            template: "bitcoin-address-template",

            // Passed directly to QRCode.js
            // https://github.com/davidshimjs/qrcodejs
            qr : {
                width: 128,
                height: 128,
                colorDark : "#000000",
                colorLight : "#ffffff"
            },

            // By default the generated QR code is bitcoin:// URL.
            // However you might want to change this for altcoins, which do not have
            // official protocol handlers. Set true to remove bitcoin:// from
            // QR code.
            qrRawAddress: false
        });
    });
</script>
```

A DOM templating is used to built the controls for the Bitcoin addresses.
Embed the following snippet hidden in <body> and customize for your needs.
See [index.html](https://github.com/miohtama/bitcoin-prices/blob/master/index.html) for example CSS styles:


```html
<div id="bitcoin-address-template" class="bitcoin-address-container" style="display: none">

    <div>
        <span class="bitcoin-address"></span>
    </div>

    <a href="#" class="bitcoin-address-action bitcoin-address-action-send">
        <i class="fa fa-btc"></i>
        Pay from wallet
    </a>

    <a href="#" class="bitcoin-address-action bitcoin-address-action-copy">
        <i class="fa fa-copy"></i>
        Copy
    </a>

    <a href="#" class="bitcoin-address-action bitcoin-address-action-qr">
        <i class="fa fa-qrcode"></i>
        QR code
    </a>

    <div class="bitcoin-action-hint bitcoin-action-hint-send">
        Sending payment to the address from locally installed Bitcoin wallet app.
    </div>

    <div class="bitcoin-action-hint bitcoin-action-hint-copy">
        Press CTRL + C or &#x2318; + C to copy the Bitcoin address.
    </div>

    <div class="bitcoin-action-hint bitcoin-action-hint-qr">
        <p>
            Scan the QR code with your mobile Bitcoin app to
            make the payment:
        </p>

        <div class="bitcoin-address-qr-container">
            <!-- Filled in by JS on action click -->
        </div>
    </div>

</div>
```

Then you can have Bitcoin addresses on your page, with or without payment amounts.

Plain Bitcoin address example:


```html
<strong class="bitcoin-address" data-bc-address="19356KxTs9Bw5AAdxens5hoxDSp5bsUKse">19356KxTs9Bw5AAdxens5hoxDSp5bsUKse</strong>
```

Bitcoin address with payment amount example:


```
<strong class="bitcoin-address"
    data-bc-amount="0.1"
    data-bc-label="bitcoinaddress.js project"
    data-bc-message="0.1 BTC donation"
    data-bc-address="19356KxTs9Bw5AAdxens5hoxDSp5bsUKse">19356KxTs9Bw5AAdxens5hoxDSp5bsUKse</strong>
```

See the demo how to nominate the payment in the fiat currency using [bitcoinprices.js](https://github.com/miohtama/bitcoin-prices) library.

### Supported data attributes

The following HTML5 data attributes are supported on `.bitcoin-address` elements


* `data-bc-address` - bitcoin address for programmatical manipulation, **required**
* `data-bc-amount` - suggestion how much to send
* `data-bc-label` - address label in the wallet
* `data-bc-message` - transaction message


## NPM packaging

This project is also packaged and distributed on [npmjs.org](https://npmjs.org/).

You can install the package with [browserify](http://browserify.org/) and various other tools to include
it in app JavaScript stack.


## Other

[See also bitcoin-prices.js JavaScript project for presenting Bitcoin prices in human-friendly manner and alternative currencies like USD and EUR](https://github.com/miohtama/bitcoin-prices).

[Bitcoin URL scheme explained](http://bitcoin.stackexchange.com/questions/4987/bitcoin-url-scheme).

[Bitcoin URIs in Electrum](https://electrum.org/bitcoin_URIs.html).

[QRCode.js - generate QR codes in JavaScript](https://github.com/davidshimjs/qrcodejs) by [Shim Sangmin](https://github.com/davidshimjs).


## Development

NPM + Node required. A `Makefile` provides many commands to develop, test and
publish this project.

[browserify](https://github.com/substack/node-browserify) used for client-side module imports.

Install dependencies locally:


```
make setup
```

Run the development server with auto-reload (save `bitcoinaddress.js` in your text editor and the browser will reload `index.html`):


```
make dev-server
```

Run unit tests locally:


```
make test-server
```

Make a release:


```
make publish
```


## Internals and the development toolchain

This package uses NPM, [browserify for JavaScript dependencies](http://browserify.org/), [beefy development server](https://github.com/chrisdickinson/beefy),
[uglify-fs](http://lisperator.net/uglifyjs/) JavaScript minimizer.

[tape](https://github.com/substack/tape) unit testing framework runs the tests on
[testling](http://testling.com/) continuous integration service infrastructure.

Check out `Makefile` if you want to learn how to use these tools.


## Author

Mikko Ohtamaa ([blog](https://opensourcehacker.com), [Facebook](https://www.facebook.com/?q=#/pages/Open-Source-Hacker/181710458567630), [Twitter](https://twitter.com/moo9000), [Google+](https://plus.google.com/u/0/103323677227728078543/))

Contact for work and consulting offers.

