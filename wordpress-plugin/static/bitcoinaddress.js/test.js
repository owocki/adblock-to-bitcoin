/**
 * tape tests for the bitcoinaddress.js.
 *
 * Check that our library loads and works with all browsers using testling.
 *
 * http://www.catonmat.net/blog/writing-javascript-tests-with-tape/
 */

/* jshint globalstrict:true */
/* globals require, __dirname, window, console */

"use strict";

var test = require("tape");
var $ = require("jquery1-browser");
var bitcoinaddress = require("./bitcoinaddress");

// Load test payload HTML from an external file using brfs complile
// time transformation
// http://stackoverflow.com/a/16951238/315168
var fs = require('fs');
var TEST_HTML = fs.readFileSync(__dirname + '/test-payload.html');

// Dummy BC address used in payload
var TEST_ADDRESS = "xxx";

/**
 * Initialize bitcoinaddress
 */
function init() {

    // Basic initialization
    bitcoinaddress.init({
        selector: ".bitcoin-address",
        template: "bitcoin-address-template",
        jQuery: $
    });
}

function reset() {
    // Clean document from all HTML content
    // (make sure don't clear <script> tags)
    $(document.body).children("div").remove();

    // Load test HTML snippets
    $(document.body).append(TEST_HTML);
}

// Don't execute tests until we have document ready
$(function() {

    test("Create Bitcoin address actions", function(t) {

        reset();

        // Check that the test payload is loaded
        t.equal($("#test-address").size(), 1);
        t.equal($("#bitcoin-address-template").size(), 1);

        // Initialize bitcoinaddress module
        init();

        // Now #test-address should be transformed

        // Check we get 3 actions for handling the address
        var actions = $("#test-address .bitcoin-address-action");
        t.equal(actions.size(), 3);

        // Check address is still displayed correctly
        var addr = $("#test-address .bitcoin-address");
        t.equal(addr.text(), TEST_ADDRESS);

        t.end();
    });

    test("Show QR code", function(t) {

        reset();
        init();

        // Simulate QR action
        var addr = $("#test-address");
        var action = addr.find(".bitcoin-address-action-qr");
        action.click();

        // Let the event sunk in
        setTimeout(function() {
            var qrContainer = addr.find(".bitcoin-address-qr-container");
            var imgs = qrContainer.find("img");
            t.equals(imgs.size(), 1);
            var src = imgs.attr("src");
            t.ok(src, "QR code <img> src was empty");
            t.equals(src.slice(0, 5), "data:");
            t.end();
        }, 2500);

    });

});