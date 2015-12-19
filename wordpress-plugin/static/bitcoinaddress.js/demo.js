/* jshint globalstrict:true */
/* globals require */

"use strict";

var $ = require("jquery/dist/jquery")(window);
var bitcoinprices = require("bitcoinprices");
var bitcoinaddress = require("./bitcoinaddress");

$(document).ready(function() {

    // Basic initialization
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

        jQuery: $
    });

    // Construct USD nominated donation button
    $(document).on("marketdataavailable", function() {

        // Scrape source for the amount and convert the USD nominated amount ot BTC
        var usdDonationElem = $("#donation-usd");

        var amount = usdDonationElem.attr("data-usd-amount");
        var btcAmount = bitcoinprices.convert(parseFloat(amount), "USD", "BTC");

        // Round 7 decimals as
        // BC wallets may not be able to deal with too many
        // decimals in the price
        btcAmount = Math.round(btcAmount*10000000)/10000000;

        // The address is marked with a special CSS class,
        // so that it doesn't get initialized with bitcoin addresses
        // on page load, as we don't have market data available by then
        var addr = usdDonationElem.find(".bitcoin-address-usd");

        // Apply bitcoin address template
        addr.attr("data-bc-amount", btcAmount);
        bitcoinaddress.applyTemplate(addr);

        // Show the donation amount in the selected currency
        var currency = bitcoinprices.getActiveCurrency();
        var amountInActiveCurrency = bitcoinprices.convert(parseFloat(amount), "USD", currency);

        var donationPrice = usdDonationElem.find(".clickable-price");
        donationPrice.html(bitcoinprices.formatPrice(amountInActiveCurrency, currency, true));
        donationPrice.attr("data-btc-price", btcAmount);

        usdDonationElem.show();
    });

    // Initialize bitcoinprices helper library needed
    // for USD nominated prices
    bitcoinprices.init({
        url: "https://api.bitcoinaverage.com/ticker/all",
        marketRateVariable: "24h_avg",
        currencies: ["BTC", "USD", "EUR", "CNY"],
        symbols: {
            "BTC": "<i class='fa fa-btc'></i>"
        },
        defaultCurrency: "BTC",
        ux : {
            clickPrices : true,
            menu : true,
        },

        // Pass our explicit jQuery object
        jQuery: $
    });

    // For the test purpose, trigger extra scan to see it doesn't do anything evil
    // with the layout
    bitcoinaddress.scan();
});
