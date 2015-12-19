/**
 * bitcoinaddress.js
 *
 * Bitcoin address and payment helper.
 *
 * Copyright 2013 Mikko Ohtamaa http://opensourcehacker.com
 *
 * Licensed under MIT license.
 */


// Please note that script this depends on jQuery,
// but I did not find a solution for having UMD loading for the script,
// so that jQuery would be available through browserify bundling
// OR CDN. Include jQuery externally before including this script.

/* global module, require */
var qrcode = require("./qrcode.js");

// jQuery reference
var $;

module.exports = {

    config : null,

    /**
     * Create URL for bitcoin URI scheme payments.
     *
     * https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki#Examples
     *
     * http://bitcoin.stackexchange.com/questions/4987/bitcoin-url-scheme
     *
     * @param  {String} address Receiving address
     * @param  {String} amount  Amount as big decimal
     * @param  {String} label   [description]
     * @param  {[type]} message [description]
     * @return {[type]}         [description]
     */
    buildBitcoinURI : function(address, amount, label, message) {
        var tmpl = ["bitcoin:", address, "?"];

        if(amount) {
            tmpl = tmpl.concat(["amount=", encodeURIComponent(amount), "&"]);
        }

        if(label) {
            tmpl = tmpl.concat(["label=", encodeURIComponent(label), "&"]);
        }

        if(message) {
            tmpl = tmpl.concat(["message=", encodeURIComponent(message), "&"]);
        }
        // Remove prefixing extra
        var lastc = tmpl[tmpl.length-1];
        if(lastc == "&" || lastc == "?") {
            tmpl = tmpl.splice(0, tmpl.length-1);
        }

        return tmpl.join("");
    },

    /**
     * Build special HTML for bitcoin address manipulation.
     * @param  {DOM} elem   Templatized target
     * @param  {DOM} source Original source tree element with data attributes
     */
    buildControls : function(elem, source) {

        // Replace .bitcoin-address in the template
        var addr = elem.find(".bitcoin-address");

        // Add a maker class so that we don't reapply template
        // on the subsequent scans
        addr.addClass("bitcoin-address-controls");

        addr.text(source.attr("data-bc-address"));

        // Copy orignal attributes;
        $.each(["address", "amount", "label", "message"], function() {
            var attrName = "data-bc-" + this;
            elem.attr(attrName, source.attr(attrName));
        });

        // Build BTC URL
        var url = this.buildBitcoinURI(source.attr("data-bc-address"),
            source.attr("data-bc-amount"),
            source.attr("data-bc-label"),
            source.attr("data-bc-message"));

        elem.find(".bitcoin-address-action-send").attr("href", url);
    },

    /**
     * Get the template element defined in the options.
     * @return {[type]} [description]
     */
    getTemplate : function() {

        var template = document.getElementById(this.config.template);

        if(!template) {
            throw new Error("Bitcoin address template element missing:" + this.config.template);
        }

        template = $(template);

        if(template.size() != 1) {
            throw new Error("Bitcoin address template DOM does not contain a single element");
        }

        return template;
    },

    /**
     * Applies bitcoinaddress DOM template to a certain element.
     *
     * The `target` element must contain necessary data-attributes
     * from where we scoop the info.
     *
     * Also builds bitcoin: URI.
     *
     * @param {jQuery} elem jQuery selection of target bitcoin address
     * @param {jQuery} template (optional) Template element to be applied
     */
    applyTemplate : function(target, template) {

        if(!template) {
            template = this.getTemplate();
        }

        // Make a deep copy, so we don't accidentally modify
        // template elements in-place
        var elem = template.clone(false, true);

        this.buildControls(elem, target);

        // Make sure we are visible (HTML5 way, CSS way)
        // and clean up the template id if we managed to copy it around
        elem.removeAttr("hidden id");

        elem.show();

        target.replaceWith(elem);
    },

    /**
     * Scan the page for bitcoin addresses.
     *
     * Create user interface for all bitcoin address elements on the page-.
     * You can call this function multiple times if new bitcoin addresses become available.
     */
    scan: function() {
        var self = this;

        var template = this.getTemplate();

        // Optionally bail out if the default selection
        // is not given (user calls applyTemplate() manually)
        if(!this.config.selector) {
            return;
        }

        $(this.config.selector).each(function() {

            var $this = $(this);

            // Template already applied
            if($this.hasClass("bitcoin-address-controls")) {
                return;
            }

            // Make sure we don't apply the template on the template itself
            if($this.parents("#" + self.config.template).size() > 0) {
                return;
            }

            // Don't reapply templates on subsequent scans

            self.applyTemplate($this, template);
        });
    },

    /**
     * Prepare selection in .bitcoin-address-container for copy paste
     */
    prepareCopySelection : function(elem) {
        var addy = elem.find(".bitcoin-address");
        window.getSelection().selectAllChildren(addy.get(0));
        elem.find(".bitcoin-action-hint").hide();
        elem.find(".bitcoin-action-hint-copy").slideDown();
    },

    /**
     * Send payment action handler
     */
    onActionSend : function(e) {
        var elem = $(e.target).parents(".bitcoin-address-container");
        // We never know if the click action was succesfully complete
        elem.find(".bitcoin-action-hint").hide();
        elem.find(".bitcoin-action-hint-send").slideDown();
    },

    /**
     * Copy action handler.
     */
    onActionCopy : function(e) {
        e.preventDefault();
        var elem = $(e.target).parents(".bitcoin-address-container");
        this.prepareCopySelection(elem);
        return false;
    },


    /**
     * Generates QR code inside the target element.
     */
    generateQR : function(qrContainer) {

        var elem = qrContainer.parents(".bitcoin-address-container");
        var url;
        //var addr = elem.attr("data-bc-address");

        if(this.config.qrRawAddress) {
            url = elem.attr("data-bc-address");
        } else {
            url = this.buildBitcoinURI(elem.attr("data-bc-address"),
            elem.attr("data-bc-amount"),
            elem.attr("data-bc-label"));
        }

        var options = $.extend({}, this.config.qr, {
            text: url
        });
        var qrCode = new qrcode.QRCode(qrContainer.get(0), options);
    },

    /**
     * QR code generation action.
     */
    onActionQR : function(e) {
        e.preventDefault();
        var elem = $(e.target).parents(".bitcoin-address-container");
        var addr = elem.attr("data-bc-address");
        var qrContainer = elem.find(".bitcoin-address-qr-container");

        // Lazily generate the QR code
        if(qrContainer.children().size() === 0) {
            this.generateQR(qrContainer);
        }

        elem.find(".bitcoin-action-hint").hide();
        elem.find(".bitcoin-action-hint-qr").slideDown();

        return false;
    },

    onClick : function(e) {
        var elem = $(e.target).parents(".bitcoin-address-container");
        this.prepareCopySelection(elem);
    },

    initUX : function() {
        var self = this;

        $(document.body).on("click", ".bitcoin-address-action-copy", $.proxy(this.onActionCopy, this));
        $(document.body).on("click", ".bitcoin-address-action-send", $.proxy(this.onActionSend, this));
        $(document.body).on("click", ".bitcoin-address-action-qr", $.proxy(this.onActionQR, this));
        $(document.body).on("click", ".bitcoin-address", $.proxy(this.onClick, this));

        // Hide any copy hints when user presses CTRL+C
        // on any part of the page
        $(document.body).on("copy", function() {
            $(".bitcoin-action-hint-copy").slideUp();
        });

        if(this.config.generateQREagerly) {
            $(".bitcoin-address-container").each(function() {
                var elem = $(this);
                var addr = elem.attr("data-bc-address");
                var qrContainer = elem.find(".bitcoin-address-qr-container");
                self.generateQR(qrContainer);
            });
        }

    },

    /**
     * Call to initialize the detault bitcoinprices UI.
     */
    init : function(_config) {
        var self = this;

        if(!_config) {
            throw new Error("You must give bitcoinaddress config object");
        }
        this.config = _config;
        $ = this.config.jQuery || jQuery;
        this.scan();
        this.initUX();
    }
};
