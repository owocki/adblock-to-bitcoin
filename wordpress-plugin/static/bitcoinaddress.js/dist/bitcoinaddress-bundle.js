!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.bitcoinaddress=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./qrcode.js":2}],2:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @fileoverview
 * - Using the 'QRCode for Javascript library'
 * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
 * - this library has no dependencies.
 *
 * @author davidshimjs
 * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
 * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
 */

/* global document */

var QRCode;

(function () {
    //---------------------------------------------------------------------
    // QRCode for JavaScript
    //
    // Copyright (c) 2009 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //   http://www.opensource.org/licenses/mit-license.php
    //
    // The word "QR Code" is registered trademark of
    // DENSO WAVE INCORPORATED
    //   http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------
    function QR8bitByte(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
        this.parsedData = [];

        // Added to support UTF-8 Characters
        for (var i = 0, l = this.data.length; i < l; i++) {
            var byteArray = [];
            var code = this.data.charCodeAt(i);

            if (code > 0x10000) {
                byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
                byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
                byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
                byteArray[3] = 0x80 | (code & 0x3F);
            } else if (code > 0x800) {
                byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
                byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
                byteArray[2] = 0x80 | (code & 0x3F);
            } else if (code > 0x80) {
                byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
                byteArray[1] = 0x80 | (code & 0x3F);
            } else {
                byteArray[0] = code;
            }

            this.parsedData.push(byteArray);
        }

        this.parsedData = Array.prototype.concat.apply([], this.parsedData);

        if (this.parsedData.length != this.data.length) {
            this.parsedData.unshift(191);
            this.parsedData.unshift(187);
            this.parsedData.unshift(239);
        }
    }

    QR8bitByte.prototype = {
        getLength: function (buffer) {
            return this.parsedData.length;
        },
        write: function (buffer) {
            for (var i = 0, l = this.parsedData.length; i < l; i++) {
                buffer.put(this.parsedData[i], 8);
            }
        }
    };

    function QRCodeModel(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRCodeModel.prototype={addData:function(data){var newData=new QR8bitByte(data);this.dataList.push(newData);this.dataCache=null;},isDark:function(row,col){if(row<0||this.moduleCount<=row||col<0||this.moduleCount<=col){throw new Error(row+","+col);}
    return this.modules[row][col];},getModuleCount:function(){return this.moduleCount;},make:function(){this.makeImpl(false,this.getBestMaskPattern());},makeImpl:function(test,maskPattern){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(var row=0;row<this.moduleCount;row++){this.modules[row]=new Array(this.moduleCount);for(var col=0;col<this.moduleCount;col++){this.modules[row][col]=null;}}
    this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(test,maskPattern);if(this.typeNumber>=7){this.setupTypeNumber(test);}
    if(this.dataCache==null){this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);}
    this.mapData(this.dataCache,maskPattern);},setupPositionProbePattern:function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||this.moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this.moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}},getBestMaskPattern:function(){var minLostPoint=0;var pattern=0;for(var i=0;i<8;i++){this.makeImpl(true,i);var lostPoint=QRUtil.getLostPoint(this);if(i==0||minLostPoint>lostPoint){minLostPoint=lostPoint;pattern=i;}}
    return pattern;},createMovieClip:function(target_mc,instance_name,depth){var qr_mc=target_mc.createEmptyMovieClip(instance_name,depth);var cs=1;this.make();for(var row=0;row<this.modules.length;row++){var y=row*cs;for(var col=0;col<this.modules[row].length;col++){var x=col*cs;var dark=this.modules[row][col];if(dark){qr_mc.beginFill(0,100);qr_mc.moveTo(x,y);qr_mc.lineTo(x+cs,y);qr_mc.lineTo(x+cs,y+cs);qr_mc.lineTo(x,y+cs);qr_mc.endFill();}}}
    return qr_mc;},setupTimingPattern:function(){for(var r=8;r<this.moduleCount-8;r++){if(this.modules[r][6]!=null){continue;}
    this.modules[r][6]=(r%2==0);}
    for(var c=8;c<this.moduleCount-8;c++){if(this.modules[6][c]!=null){continue;}
    this.modules[6][c]=(c%2==0);}},setupPositionAdjustPattern:function(){var pos=QRUtil.getPatternPosition(this.typeNumber);for(var i=0;i<pos.length;i++){for(var j=0;j<pos.length;j++){var row=pos[i];var col=pos[j];if(this.modules[row][col]!=null){continue;}
    for(var r=-2;r<=2;r++){for(var c=-2;c<=2;c++){if(r==-2||r==2||c==-2||c==2||(r==0&&c==0)){this.modules[row+r][col+c]=true;}else{this.modules[row+r][col+c]=false;}}}}}},setupTypeNumber:function(test){var bits=QRUtil.getBCHTypeNumber(this.typeNumber);for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod;}
    for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod;}},setupTypeInfo:function(test,maskPattern){var data=(this.errorCorrectLevel<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6){this.modules[i][8]=mod;}else if(i<8){this.modules[i+1][8]=mod;}else{this.modules[this.moduleCount-15+i][8]=mod;}}
    for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8){this.modules[8][this.moduleCount-i-1]=mod;}else if(i<9){this.modules[8][15-i-1+1]=mod;}else{this.modules[8][15-i-1]=mod;}}
    this.modules[this.moduleCount-8][8]=(!test);},mapData:function(data,maskPattern){var inc=-1;var row=this.moduleCount-1;var bitIndex=7;var byteIndex=0;for(var col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(this.modules[row][col-c]==null){var dark=false;if(byteIndex<data.length){dark=(((data[byteIndex]>>>bitIndex)&1)==1);}
    var mask=QRUtil.getMask(maskPattern,row,col-c);if(mask){dark=!dark;}
    this.modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7;}}}
    row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break;}}}}};QRCodeModel.PAD0=0xEC;QRCodeModel.PAD1=0x11;QRCodeModel.createData=function(typeNumber,errorCorrectLevel,dataList){var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,errorCorrectLevel);var buffer=new QRBitBuffer();for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(data.mode,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(data.mode,typeNumber));data.write(buffer);}
    var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++){totalDataCount+=rsBlocks[i].dataCount;}
    if(buffer.getLengthInBits()>totalDataCount*8){throw new Error("code length overflow. ("
    +buffer.getLengthInBits()
    +">"
    +totalDataCount*8
    +")");}
    if(buffer.getLengthInBits()+4<=totalDataCount*8){buffer.put(0,4);}
    while(buffer.getLengthInBits()%8!=0){buffer.putBit(false);}
    while(true){if(buffer.getLengthInBits()>=totalDataCount*8){break;}
    buffer.put(QRCodeModel.PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8){break;}
    buffer.put(QRCodeModel.PAD1,8);}
    return QRCodeModel.createBytes(buffer,rsBlocks);};QRCodeModel.createBytes=function(buffer,rsBlocks){var offset=0;var maxDcCount=0;var maxEcCount=0;var dcdata=new Array(rsBlocks.length);var ecdata=new Array(rsBlocks.length);for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++){dcdata[r][i]=0xff&buffer.buffer[i+offset];}
    offset+=dcCount;var rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(rsPoly.getLength()-1);for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}}
    var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++){totalCodeCount+=rsBlocks[i].totalCount;}
    var data=new Array(totalCodeCount);var index=0;for(var i=0;i<maxDcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<dcdata[r].length){data[index++]=dcdata[r][i];}}}
    for(var i=0;i<maxEcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<ecdata[r].length){data[index++]=ecdata[r][i];}}}
    return data;};var QRMode={MODE_NUMBER:1<<0,MODE_ALPHA_NUM:1<<1,MODE_8BIT_BYTE:1<<2,MODE_KANJI:1<<3};var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};var QRMaskPattern={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),getBCHTypeInfo:function(data){var d=data<<10;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)>=0){d^=(QRUtil.G15<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)));}
    return((data<<10)|d)^QRUtil.G15_MASK;},getBCHTypeNumber:function(data){var d=data<<12;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)>=0){d^=(QRUtil.G18<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)));}
    return(data<<12)|d;},getBCHDigit:function(data){var digit=0;while(data!=0){digit++;data>>>=1;}
    return digit;},getPatternPosition:function(typeNumber){return QRUtil.PATTERN_POSITION_TABLE[typeNumber-1];},getMask:function(maskPattern,i,j){switch(maskPattern){case QRMaskPattern.PATTERN000:return(i+j)%2==0;case QRMaskPattern.PATTERN001:return i%2==0;case QRMaskPattern.PATTERN010:return j%3==0;case QRMaskPattern.PATTERN011:return(i+j)%3==0;case QRMaskPattern.PATTERN100:return(Math.floor(i/2)+Math.floor(j/3))%2==0;case QRMaskPattern.PATTERN101:return(i*j)%2+(i*j)%3==0;case QRMaskPattern.PATTERN110:return((i*j)%2+(i*j)%3)%2==0;case QRMaskPattern.PATTERN111:return((i*j)%3+(i+j)%2)%2==0;default:throw new Error("bad maskPattern:"+maskPattern);}},getErrorCorrectPolynomial:function(errorCorrectLength){var a=new QRPolynomial([1],0);for(var i=0;i<errorCorrectLength;i++){a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));}
    return a;},getLengthInBits:function(mode,type){if(1<=type&&type<10){switch(mode){case QRMode.MODE_NUMBER:return 10;case QRMode.MODE_ALPHA_NUM:return 9;case QRMode.MODE_8BIT_BYTE:return 8;case QRMode.MODE_KANJI:return 8;default:throw new Error("mode:"+mode);}}else if(type<27){switch(mode){case QRMode.MODE_NUMBER:return 12;case QRMode.MODE_ALPHA_NUM:return 11;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 10;default:throw new Error("mode:"+mode);}}else if(type<41){switch(mode){case QRMode.MODE_NUMBER:return 14;case QRMode.MODE_ALPHA_NUM:return 13;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 12;default:throw new Error("mode:"+mode);}}else{throw new Error("type:"+type);}},getLostPoint:function(qrCode){var moduleCount=qrCode.getModuleCount();var lostPoint=0;for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount;col++){var sameCount=0;var dark=qrCode.isDark(row,col);for(var r=-1;r<=1;r++){if(row+r<0||moduleCount<=row+r){continue;}
    for(var c=-1;c<=1;c++){if(col+c<0||moduleCount<=col+c){continue;}
    if(r==0&&c==0){continue;}
    if(dark==qrCode.isDark(row+r,col+c)){sameCount++;}}}
    if(sameCount>5){lostPoint+=(3+sameCount-5);}}}
    for(var row=0;row<moduleCount-1;row++){for(var col=0;col<moduleCount-1;col++){var count=0;if(qrCode.isDark(row,col))count++;if(qrCode.isDark(row+1,col))count++;if(qrCode.isDark(row,col+1))count++;if(qrCode.isDark(row+1,col+1))count++;if(count==0||count==4){lostPoint+=3;}}}
    for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount-6;col++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row,col+1)&&qrCode.isDark(row,col+2)&&qrCode.isDark(row,col+3)&&qrCode.isDark(row,col+4)&&!qrCode.isDark(row,col+5)&&qrCode.isDark(row,col+6)){lostPoint+=40;}}}
    for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount-6;row++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row+1,col)&&qrCode.isDark(row+2,col)&&qrCode.isDark(row+3,col)&&qrCode.isDark(row+4,col)&&!qrCode.isDark(row+5,col)&&qrCode.isDark(row+6,col)){lostPoint+=40;}}}
    var darkCount=0;for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount;row++){if(qrCode.isDark(row,col)){darkCount++;}}}
    var ratio=Math.abs(100*darkCount/moduleCount/moduleCount-50)/5;lostPoint+=ratio*10;return lostPoint;}};var QRMath={glog:function(n){if(n<1){throw new Error("glog("+n+")");}
    return QRMath.LOG_TABLE[n];},gexp:function(n){while(n<0){n+=255;}
    while(n>=256){n-=255;}
    return QRMath.EXP_TABLE[n];},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var i=0;i<8;i++){QRMath.EXP_TABLE[i]=1<<i;}
    for(var i=8;i<256;i++){QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];}
    for(var i=0;i<255;i++){QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;}
    function QRPolynomial(num,shift){if(num.length==undefined){throw new Error(num.length+"/"+shift);}
    var offset=0;while(offset<num.length&&num[offset]==0){offset++;}
    this.num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++){this.num[i]=num[i+offset];}}
    QRPolynomial.prototype={get:function(index){return this.num[index];},getLength:function(){return this.num.length;},multiply:function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++){for(var j=0;j<e.getLength();j++){num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));}}
    return new QRPolynomial(num,0);},mod:function(e){if(this.getLength()-e.getLength()<0){return this;}
    var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++){num[i]=this.get(i);}
    for(var i=0;i<e.getLength();i++){num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);}
    return new QRPolynomial(num,0).mod(e);}};function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount;}
    QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];QRRSBlock.getRSBlocks=function(typeNumber,errorCorrectLevel){var rsBlock=QRRSBlock.getRsBlockTable(typeNumber,errorCorrectLevel);if(rsBlock==undefined){throw new Error("bad rs block @ typeNumber:"+typeNumber+"/errorCorrectLevel:"+errorCorrectLevel);}
    var length=rsBlock.length/3;var list=[];for(var i=0;i<length;i++){var count=rsBlock[i*3+0];var totalCount=rsBlock[i*3+1];var dataCount=rsBlock[i*3+2];for(var j=0;j<count;j++){list.push(new QRRSBlock(totalCount,dataCount));}}
    return list;};QRRSBlock.getRsBlockTable=function(typeNumber,errorCorrectLevel){switch(errorCorrectLevel){case QRErrorCorrectLevel.L:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+0];case QRErrorCorrectLevel.M:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+1];case QRErrorCorrectLevel.Q:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+2];case QRErrorCorrectLevel.H:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+3];default:return undefined;}};function QRBitBuffer(){this.buffer=[];this.length=0;}
    QRBitBuffer.prototype={get:function(index){var bufIndex=Math.floor(index/8);return((this.buffer[bufIndex]>>>(7-index%8))&1)==1;},put:function(num,length){for(var i=0;i<length;i++){this.putBit(((num>>>(length-i-1))&1)==1);}},getLengthInBits:function(){return this.length;},putBit:function(bit){var bufIndex=Math.floor(this.length/8);if(this.buffer.length<=bufIndex){this.buffer.push(0);}
    if(bit){this.buffer[bufIndex]|=(0x80>>>(this.length%8));}
    this.length++;}};var QRCodeLimitLength=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];

    function _isSupportCanvas() {
        return typeof CanvasRenderingContext2D != "undefined";
    }

    // android 2.x doesn't support Data-URI spec
    function _getAndroid() {
        var android = false;
        var sAgent = navigator.userAgent;

        if (/android/i.test(sAgent)) { // android
            android = true;
            aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);

            if (aMat && aMat[1]) {
                android = parseFloat(aMat[1]);
            }
        }

        return android;
    }

    var svgDrawer = (function() {

        var Drawing = function (el, htOption) {
            this._el = el;
            this._htOption = htOption;
        };

        Drawing.prototype.draw = function (oQRCode) {
            var _htOption = this._htOption;
            var _el = this._el;
            var nCount = oQRCode.getModuleCount();
            var nWidth = Math.floor(_htOption.width / nCount);
            var nHeight = Math.floor(_htOption.height / nCount);

            this.clear();

            function makeSVG(tag, attrs) {
                var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
                for (var k in attrs)
                    if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
                return el;
            }

            var svg = makeSVG("svg" , {'viewBox': '0 0 ' + String(nCount) + " " + String(nCount), 'width': '100%', 'height': '100%', 'fill': _htOption.colorLight});
            svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
            _el.appendChild(svg);

            svg.appendChild(makeSVG("rect", {"fill": _htOption.colorDark, "width": "1", "height": "1", "id": "template"}));

            for (var row = 0; row < nCount; row++) {
                for (var col = 0; col < nCount; col++) {
                    if (oQRCode.isDark(row, col)) {
                        var child = makeSVG("use", {"x": String(row), "y": String(col)});
                        child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template")
                        svg.appendChild(child);
                    }
                }
            }
        };
        Drawing.prototype.clear = function () {
            while (this._el.hasChildNodes())
                this._el.removeChild(this._el.lastChild);
        };
        return Drawing;
    })();

    // Had to change this a bit, because of browserify.
    // document properties cannot be tested when the JS is loaded,
    // all window/document access should be done in the event handlers only.
    var useSVG;
    if(global) {
        // tape + Pure NodeJS
        useSVG = false;
    } else {
        useSVG = document.documentElement.tagName.toLowerCase() === "svg";
    }

    // Drawing in DOM by using Table tag
    var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? (function () {
        var Drawing = function (el, htOption) {
            this._el = el;
            this._htOption = htOption;
        };

        /**
         * Draw the QRCode
         *
         * @param {QRCode} oQRCode
         */
        Drawing.prototype.draw = function (oQRCode) {
            var _htOption = this._htOption;
            var _el = this._el;
            var nCount = oQRCode.getModuleCount();
            var nWidth = Math.floor(_htOption.width / nCount);
            var nHeight = Math.floor(_htOption.height / nCount);
            var aHTML = ['<table style="border:0;border-collapse:collapse;">'];

            for (var row = 0; row < nCount; row++) {
                aHTML.push('<tr>');

                for (var col = 0; col < nCount; col++) {
                    aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
                }

                aHTML.push('</tr>');
            }

            aHTML.push('</table>');
            _el.innerHTML = aHTML.join('');

            // Fix the margin values as real size.
            var elTable = _el.childNodes[0];
            var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
            var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;

            if (nLeftMarginTable > 0 && nTopMarginTable > 0) {
                elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";
            }
        };

        /**
         * Clear the QRCode
         */
        Drawing.prototype.clear = function () {
            this._el.innerHTML = '';
        };

        return Drawing;
    })() : (function () { // Drawing in Canvas
        function _onMakeImage() {
            this._elImage.src = this._elCanvas.toDataURL("image/png");
            this._elImage.style.display = "block";
            this._elCanvas.style.display = "none";
        }

        // Android 2.1 bug workaround
        // http://code.google.com/p/android/issues/detail?id=5141
        if (this._android && this._android <= 2.1) {
            var factor = 1 / window.devicePixelRatio;
            var drawImage = CanvasRenderingContext2D.prototype.drawImage;
            CanvasRenderingContext2D.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
                if (("nodeName" in image) && /img/i.test(image.nodeName)) {
                    for (var i = arguments.length - 1; i >= 1; i--) {
                        arguments[i] = arguments[i] * factor;
                    }
                } else if (typeof dw == "undefined") {
                    arguments[1] *= factor;
                    arguments[2] *= factor;
                    arguments[3] *= factor;
                    arguments[4] *= factor;
                }

                drawImage.apply(this, arguments);
            };
        }

        /**
         * Check whether the user's browser supports Data URI or not
         *
         * @private
         * @param {Function} fSuccess Occurs if it supports Data URI
         * @param {Function} fFail Occurs if it doesn't support Data URI
         */
        function _safeSetDataURI(fSuccess, fFail) {
            var self = this;
            self._fFail = fFail;
            self._fSuccess = fSuccess;

            // Check it just once
            if (self._bSupportDataURI === null) {
                var el = document.createElement("img");
                var fOnError = function() {
                    self._bSupportDataURI = false;

                    if (self._fFail) {
                        _fFail.call(self);
                    }
                };
                var fOnSuccess = function() {
                    self._bSupportDataURI = true;

                    if (self._fSuccess) {
                        self._fSuccess.call(self);
                    }
                };

                el.onabort = fOnError;
                el.onerror = fOnError;
                el.onload = fOnSuccess;
                el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.
                return;
            } else if (self._bSupportDataURI === true && self._fSuccess) {
                self._fSuccess.call(self);
            } else if (self._bSupportDataURI === false && self._fFail) {
                self._fFail.call(self);
            }
        };

        /**
         * Drawing QRCode by using canvas
         *
         * @constructor
         * @param {HTMLElement} el
         * @param {Object} htOption QRCode Options
         */
        var Drawing = function (el, htOption) {
            this._bIsPainted = false;
            this._android = _getAndroid();

            this._htOption = htOption;
            this._elCanvas = document.createElement("canvas");
            this._elCanvas.width = htOption.width;
            this._elCanvas.height = htOption.height;
            el.appendChild(this._elCanvas);
            this._el = el;
            this._oContext = this._elCanvas.getContext("2d");
            this._bIsPainted = false;
            this._elImage = document.createElement("img");
            this._elImage.style.display = "none";
            this._el.appendChild(this._elImage);
            this._bSupportDataURI = null;
        };

        /**
         * Draw the QRCode
         *
         * @param {QRCode} oQRCode
         */
        Drawing.prototype.draw = function (oQRCode) {
            var _elImage = this._elImage;
            var _oContext = this._oContext;
            var _htOption = this._htOption;

            var nCount = oQRCode.getModuleCount();
            var nWidth = _htOption.width / nCount;
            var nHeight = _htOption.height / nCount;
            var nRoundedWidth = Math.round(nWidth);
            var nRoundedHeight = Math.round(nHeight);

            _elImage.style.display = "none";
            this.clear();

            for (var row = 0; row < nCount; row++) {
                for (var col = 0; col < nCount; col++) {
                    var bIsDark = oQRCode.isDark(row, col);
                    var nLeft = col * nWidth;
                    var nTop = row * nHeight;
                    _oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
                    _oContext.lineWidth = 1;
                    _oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
                    _oContext.fillRect(nLeft, nTop, nWidth, nHeight);

                    // 안티 앨리어싱 방지 처리
                    _oContext.strokeRect(
                        Math.floor(nLeft) + 0.5,
                        Math.floor(nTop) + 0.5,
                        nRoundedWidth,
                        nRoundedHeight
                    );

                    _oContext.strokeRect(
                        Math.ceil(nLeft) - 0.5,
                        Math.ceil(nTop) - 0.5,
                        nRoundedWidth,
                        nRoundedHeight
                    );
                }
            }

            this._bIsPainted = true;
        };

        /**
         * Make the image from Canvas if the browser supports Data URI.
         */
        Drawing.prototype.makeImage = function () {
            if (this._bIsPainted) {
                _safeSetDataURI.call(this, _onMakeImage);
            }
        };

        /**
         * Return whether the QRCode is painted or not
         *
         * @return {Boolean}
         */
        Drawing.prototype.isPainted = function () {
            return this._bIsPainted;
        };

        /**
         * Clear the QRCode
         */
        Drawing.prototype.clear = function () {
            this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);
            this._bIsPainted = false;
        };

        /**
         * @private
         * @param {Number} nNumber
         */
        Drawing.prototype.round = function (nNumber) {
            if (!nNumber) {
                return nNumber;
            }

            return Math.floor(nNumber * 1000) / 1000;
        };

        return Drawing;
    })();

    /**
     * Get the type by string length
     *
     * @private
     * @param {String} sText
     * @param {Number} nCorrectLevel
     * @return {Number} type
     */
    function _getTypeNumber(sText, nCorrectLevel) {
        var nType = 1;
        var length = _getUTF8Length(sText);

        for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
            var nLimit = 0;

            switch (nCorrectLevel) {
                case QRErrorCorrectLevel.L :
                    nLimit = QRCodeLimitLength[i][0];
                    break;
                case QRErrorCorrectLevel.M :
                    nLimit = QRCodeLimitLength[i][1];
                    break;
                case QRErrorCorrectLevel.Q :
                    nLimit = QRCodeLimitLength[i][2];
                    break;
                case QRErrorCorrectLevel.H :
                    nLimit = QRCodeLimitLength[i][3];
                    break;
            }

            if (length <= nLimit) {
                break;
            } else {
                nType++;
            }
        }

        if (nType > QRCodeLimitLength.length) {
            throw new Error("Too long data");
        }

        return nType;
    }

    function _getUTF8Length(sText) {
        var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
        return replacedText.length + (replacedText.length != sText ? 3 : 0);
    }

    /**
     * @class QRCode
     * @constructor
     * @example
     * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
     *
     * @example
     * var oQRCode = new QRCode("test", {
     *    text : "http://naver.com",
     *    width : 128,
     *    height : 128
     * });
     *
     * oQRCode.clear(); // Clear the QRCode.
     * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
     *
     * @param {HTMLElement|String} el target element or 'id' attribute of element.
     * @param {Object|String} vOption
     * @param {String} vOption.text QRCode link data
     * @param {Number} [vOption.width=256]
     * @param {Number} [vOption.height=256]
     * @param {String} [vOption.colorDark="#000000"]
     * @param {String} [vOption.colorLight="#ffffff"]
     * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H]
     */
    QRCode = function (el, vOption) {
        this._htOption = {
            width : 256,
            height : 256,
            typeNumber : 4,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRErrorCorrectLevel.H
        };

        if (typeof vOption === 'string') {
            vOption = {
                text : vOption
            };
        }

        // Overwrites options
        if (vOption) {
            for (var i in vOption) {
                this._htOption[i] = vOption[i];
            }
        }

        if (typeof el == "string") {
            el = document.getElementById(el);
        }

        this._android = _getAndroid();
        this._el = el;
        this._oQRCode = null;
        this._oDrawing = new Drawing(this._el, this._htOption);

        if (this._htOption.text) {
            this.makeCode(this._htOption.text);
        }
    };

    /**
     * Make the QRCode
     *
     * @param {String} sText link data
     */
    QRCode.prototype.makeCode = function (sText) {
        this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);
        this._oQRCode.addData(sText);
        this._oQRCode.make();
        this._el.title = sText;
        this._oDrawing.draw(this._oQRCode);
        this.makeImage();
    };

    /**
     * Make the Image from Canvas element
     * - It occurs automatically
     * - Android below 3 doesn't support Data-URI spec.
     *
     * @private
     */
    QRCode.prototype.makeImage = function () {
        if (typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) {
            this._oDrawing.makeImage();
        }
    };

    /**
     * Clear the QRCode
     */
    QRCode.prototype.clear = function () {
        this._oDrawing.clear();
    };

    /**
     * @name QRCode.CorrectLevel
     */
    QRCode.CorrectLevel = QRErrorCorrectLevel;
})();

exports.QRCode = QRCode;


},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWtrby9jb2RlL2FwcGxlYnl0ZXN0b3JlL0xpYmVydHlNdXNpY1N0b3JlL3RhdGlhbmFzdG9yZS9zdGF0aWMvYml0Y29pbmFkZHJlc3Mvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9taWtrby9jb2RlL2FwcGxlYnl0ZXN0b3JlL0xpYmVydHlNdXNpY1N0b3JlL3RhdGlhbmFzdG9yZS9zdGF0aWMvYml0Y29pbmFkZHJlc3MvYml0Y29pbmFkZHJlc3MuanMiLCIvVXNlcnMvbWlra28vY29kZS9hcHBsZWJ5dGVzdG9yZS9MaWJlcnR5TXVzaWNTdG9yZS90YXRpYW5hc3RvcmUvc3RhdGljL2JpdGNvaW5hZGRyZXNzL3FyY29kZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogYml0Y29pbmFkZHJlc3MuanNcbiAqXG4gKiBCaXRjb2luIGFkZHJlc3MgYW5kIHBheW1lbnQgaGVscGVyLlxuICpcbiAqIENvcHlyaWdodCAyMDEzIE1pa2tvIE9odGFtYWEgaHR0cDovL29wZW5zb3VyY2VoYWNrZXIuY29tXG4gKlxuICogTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2UuXG4gKi9cblxuXG4vLyBQbGVhc2Ugbm90ZSB0aGF0IHNjcmlwdCB0aGlzIGRlcGVuZHMgb24galF1ZXJ5LFxuLy8gYnV0IEkgZGlkIG5vdCBmaW5kIGEgc29sdXRpb24gZm9yIGhhdmluZyBVTUQgbG9hZGluZyBmb3IgdGhlIHNjcmlwdCxcbi8vIHNvIHRoYXQgalF1ZXJ5IHdvdWxkIGJlIGF2YWlsYWJsZSB0aHJvdWdoIGJyb3dzZXJpZnkgYnVuZGxpbmdcbi8vIE9SIENETi4gSW5jbHVkZSBqUXVlcnkgZXh0ZXJuYWxseSBiZWZvcmUgaW5jbHVkaW5nIHRoaXMgc2NyaXB0LlxuXG4vKiBnbG9iYWwgbW9kdWxlLCByZXF1aXJlICovXG52YXIgcXJjb2RlID0gcmVxdWlyZShcIi4vcXJjb2RlLmpzXCIpO1xuXG4vLyBqUXVlcnkgcmVmZXJlbmNlXG52YXIgJDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBjb25maWcgOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIFVSTCBmb3IgYml0Y29pbiBVUkkgc2NoZW1lIHBheW1lbnRzLlxuICAgICAqXG4gICAgICogaHR0cHM6Ly9naXRodWIuY29tL2JpdGNvaW4vYmlwcy9ibG9iL21hc3Rlci9iaXAtMDAyMS5tZWRpYXdpa2kjRXhhbXBsZXNcbiAgICAgKlxuICAgICAqIGh0dHA6Ly9iaXRjb2luLnN0YWNrZXhjaGFuZ2UuY29tL3F1ZXN0aW9ucy80OTg3L2JpdGNvaW4tdXJsLXNjaGVtZVxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhZGRyZXNzIFJlY2VpdmluZyBhZGRyZXNzXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBhbW91bnQgIEFtb3VudCBhcyBiaWcgZGVjaW1hbFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gbGFiZWwgICBbZGVzY3JpcHRpb25dXG4gICAgICogQHBhcmFtICB7W3R5cGVdfSBtZXNzYWdlIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcmV0dXJuIHtbdHlwZV19ICAgICAgICAgW2Rlc2NyaXB0aW9uXVxuICAgICAqL1xuICAgIGJ1aWxkQml0Y29pblVSSSA6IGZ1bmN0aW9uKGFkZHJlc3MsIGFtb3VudCwgbGFiZWwsIG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIHRtcGwgPSBbXCJiaXRjb2luOlwiLCBhZGRyZXNzLCBcIj9cIl07XG5cbiAgICAgICAgaWYoYW1vdW50KSB7XG4gICAgICAgICAgICB0bXBsID0gdG1wbC5jb25jYXQoW1wiYW1vdW50PVwiLCBlbmNvZGVVUklDb21wb25lbnQoYW1vdW50KSwgXCImXCJdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKGxhYmVsKSB7XG4gICAgICAgICAgICB0bXBsID0gdG1wbC5jb25jYXQoW1wibGFiZWw9XCIsIGVuY29kZVVSSUNvbXBvbmVudChsYWJlbCksIFwiJlwiXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZihtZXNzYWdlKSB7XG4gICAgICAgICAgICB0bXBsID0gdG1wbC5jb25jYXQoW1wibWVzc2FnZT1cIiwgZW5jb2RlVVJJQ29tcG9uZW50KG1lc3NhZ2UpLCBcIiZcIl0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlbW92ZSBwcmVmaXhpbmcgZXh0cmFcbiAgICAgICAgdmFyIGxhc3RjID0gdG1wbFt0bXBsLmxlbmd0aC0xXTtcbiAgICAgICAgaWYobGFzdGMgPT0gXCImXCIgfHwgbGFzdGMgPT0gXCI/XCIpIHtcbiAgICAgICAgICAgIHRtcGwgPSB0bXBsLnNwbGljZSgwLCB0bXBsLmxlbmd0aC0xKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0bXBsLmpvaW4oXCJcIik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNwZWNpYWwgSFRNTCBmb3IgYml0Y29pbiBhZGRyZXNzIG1hbmlwdWxhdGlvbi5cbiAgICAgKiBAcGFyYW0gIHtET019IGVsZW0gICBUZW1wbGF0aXplZCB0YXJnZXRcbiAgICAgKiBAcGFyYW0gIHtET019IHNvdXJjZSBPcmlnaW5hbCBzb3VyY2UgdHJlZSBlbGVtZW50IHdpdGggZGF0YSBhdHRyaWJ1dGVzXG4gICAgICovXG4gICAgYnVpbGRDb250cm9scyA6IGZ1bmN0aW9uKGVsZW0sIHNvdXJjZSkge1xuXG4gICAgICAgIC8vIFJlcGxhY2UgLmJpdGNvaW4tYWRkcmVzcyBpbiB0aGUgdGVtcGxhdGVcbiAgICAgICAgdmFyIGFkZHIgPSBlbGVtLmZpbmQoXCIuYml0Y29pbi1hZGRyZXNzXCIpO1xuXG4gICAgICAgIC8vIEFkZCBhIG1ha2VyIGNsYXNzIHNvIHRoYXQgd2UgZG9uJ3QgcmVhcHBseSB0ZW1wbGF0ZVxuICAgICAgICAvLyBvbiB0aGUgc3Vic2VxdWVudCBzY2Fuc1xuICAgICAgICBhZGRyLmFkZENsYXNzKFwiYml0Y29pbi1hZGRyZXNzLWNvbnRyb2xzXCIpO1xuXG4gICAgICAgIGFkZHIudGV4dChzb3VyY2UuYXR0cihcImRhdGEtYmMtYWRkcmVzc1wiKSk7XG5cbiAgICAgICAgLy8gQ29weSBvcmlnbmFsIGF0dHJpYnV0ZXM7XG4gICAgICAgICQuZWFjaChbXCJhZGRyZXNzXCIsIFwiYW1vdW50XCIsIFwibGFiZWxcIiwgXCJtZXNzYWdlXCJdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhdHRyTmFtZSA9IFwiZGF0YS1iYy1cIiArIHRoaXM7XG4gICAgICAgICAgICBlbGVtLmF0dHIoYXR0ck5hbWUsIHNvdXJjZS5hdHRyKGF0dHJOYW1lKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIEJUQyBVUkxcbiAgICAgICAgdmFyIHVybCA9IHRoaXMuYnVpbGRCaXRjb2luVVJJKHNvdXJjZS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpLFxuICAgICAgICAgICAgc291cmNlLmF0dHIoXCJkYXRhLWJjLWFtb3VudFwiKSxcbiAgICAgICAgICAgIHNvdXJjZS5hdHRyKFwiZGF0YS1iYy1sYWJlbFwiKSxcbiAgICAgICAgICAgIHNvdXJjZS5hdHRyKFwiZGF0YS1iYy1tZXNzYWdlXCIpKTtcblxuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hZGRyZXNzLWFjdGlvbi1zZW5kXCIpLmF0dHIoXCJocmVmXCIsIHVybCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgdGVtcGxhdGUgZWxlbWVudCBkZWZpbmVkIGluIHRoZSBvcHRpb25zLlxuICAgICAqIEByZXR1cm4ge1t0eXBlXX0gW2Rlc2NyaXB0aW9uXVxuICAgICAqL1xuICAgIGdldFRlbXBsYXRlIDogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdmFyIHRlbXBsYXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5jb25maWcudGVtcGxhdGUpO1xuXG4gICAgICAgIGlmKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQml0Y29pbiBhZGRyZXNzIHRlbXBsYXRlIGVsZW1lbnQgbWlzc2luZzpcIiArIHRoaXMuY29uZmlnLnRlbXBsYXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlbXBsYXRlID0gJCh0ZW1wbGF0ZSk7XG5cbiAgICAgICAgaWYodGVtcGxhdGUuc2l6ZSgpICE9IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJpdGNvaW4gYWRkcmVzcyB0ZW1wbGF0ZSBET00gZG9lcyBub3QgY29udGFpbiBhIHNpbmdsZSBlbGVtZW50XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIGJpdGNvaW5hZGRyZXNzIERPTSB0ZW1wbGF0ZSB0byBhIGNlcnRhaW4gZWxlbWVudC5cbiAgICAgKlxuICAgICAqIFRoZSBgdGFyZ2V0YCBlbGVtZW50IG11c3QgY29udGFpbiBuZWNlc3NhcnkgZGF0YS1hdHRyaWJ1dGVzXG4gICAgICogZnJvbSB3aGVyZSB3ZSBzY29vcCB0aGUgaW5mby5cbiAgICAgKlxuICAgICAqIEFsc28gYnVpbGRzIGJpdGNvaW46IFVSSS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtIGpRdWVyeSBzZWxlY3Rpb24gb2YgdGFyZ2V0IGJpdGNvaW4gYWRkcmVzc1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSB0ZW1wbGF0ZSAob3B0aW9uYWwpIFRlbXBsYXRlIGVsZW1lbnQgdG8gYmUgYXBwbGllZFxuICAgICAqL1xuICAgIGFwcGx5VGVtcGxhdGUgOiBmdW5jdGlvbih0YXJnZXQsIHRlbXBsYXRlKSB7XG5cbiAgICAgICAgaWYoIXRlbXBsYXRlKSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9IHRoaXMuZ2V0VGVtcGxhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2UgYSBkZWVwIGNvcHksIHNvIHdlIGRvbid0IGFjY2lkZW50YWxseSBtb2RpZnlcbiAgICAgICAgLy8gdGVtcGxhdGUgZWxlbWVudHMgaW4tcGxhY2VcbiAgICAgICAgdmFyIGVsZW0gPSB0ZW1wbGF0ZS5jbG9uZShmYWxzZSwgdHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5idWlsZENvbnRyb2xzKGVsZW0sIHRhcmdldCk7XG5cbiAgICAgICAgLy8gTWFrZSBzdXJlIHdlIGFyZSB2aXNpYmxlIChIVE1MNSB3YXksIENTUyB3YXkpXG4gICAgICAgIC8vIGFuZCBjbGVhbiB1cCB0aGUgdGVtcGxhdGUgaWQgaWYgd2UgbWFuYWdlZCB0byBjb3B5IGl0IGFyb3VuZFxuICAgICAgICBlbGVtLnJlbW92ZUF0dHIoXCJoaWRkZW4gaWRcIik7XG5cbiAgICAgICAgZWxlbS5zaG93KCk7XG5cbiAgICAgICAgdGFyZ2V0LnJlcGxhY2VXaXRoKGVsZW0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTY2FuIHRoZSBwYWdlIGZvciBiaXRjb2luIGFkZHJlc3Nlcy5cbiAgICAgKlxuICAgICAqIENyZWF0ZSB1c2VyIGludGVyZmFjZSBmb3IgYWxsIGJpdGNvaW4gYWRkcmVzcyBlbGVtZW50cyBvbiB0aGUgcGFnZS0uXG4gICAgICogWW91IGNhbiBjYWxsIHRoaXMgZnVuY3Rpb24gbXVsdGlwbGUgdGltZXMgaWYgbmV3IGJpdGNvaW4gYWRkcmVzc2VzIGJlY29tZSBhdmFpbGFibGUuXG4gICAgICovXG4gICAgc2NhbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLmdldFRlbXBsYXRlKCk7XG5cbiAgICAgICAgLy8gT3B0aW9uYWxseSBiYWlsIG91dCBpZiB0aGUgZGVmYXVsdCBzZWxlY3Rpb25cbiAgICAgICAgLy8gaXMgbm90IGdpdmVuICh1c2VyIGNhbGxzIGFwcGx5VGVtcGxhdGUoKSBtYW51YWxseSlcbiAgICAgICAgaWYoIXRoaXMuY29uZmlnLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMuY29uZmlnLnNlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wbGF0ZSBhbHJlYWR5IGFwcGxpZWRcbiAgICAgICAgICAgIGlmKCR0aGlzLmhhc0NsYXNzKFwiYml0Y29pbi1hZGRyZXNzLWNvbnRyb2xzXCIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgd2UgZG9uJ3QgYXBwbHkgdGhlIHRlbXBsYXRlIG9uIHRoZSB0ZW1wbGF0ZSBpdHNlbGZcbiAgICAgICAgICAgIGlmKCR0aGlzLnBhcmVudHMoXCIjXCIgKyBzZWxmLmNvbmZpZy50ZW1wbGF0ZSkuc2l6ZSgpID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRG9uJ3QgcmVhcHBseSB0ZW1wbGF0ZXMgb24gc3Vic2VxdWVudCBzY2Fuc1xuXG4gICAgICAgICAgICBzZWxmLmFwcGx5VGVtcGxhdGUoJHRoaXMsIHRlbXBsYXRlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgc2VsZWN0aW9uIGluIC5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyIGZvciBjb3B5IHBhc3RlXG4gICAgICovXG4gICAgcHJlcGFyZUNvcHlTZWxlY3Rpb24gOiBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAgIHZhciBhZGR5ID0gZWxlbS5maW5kKFwiLmJpdGNvaW4tYWRkcmVzc1wiKTtcbiAgICAgICAgd2luZG93LmdldFNlbGVjdGlvbigpLnNlbGVjdEFsbENoaWxkcmVuKGFkZHkuZ2V0KDApKTtcbiAgICAgICAgZWxlbS5maW5kKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnRcIikuaGlkZSgpO1xuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludC1jb3B5XCIpLnNsaWRlRG93bigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIHBheW1lbnQgYWN0aW9uIGhhbmRsZXJcbiAgICAgKi9cbiAgICBvbkFjdGlvblNlbmQgOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIHZhciBlbGVtID0gJChlLnRhcmdldCkucGFyZW50cyhcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpO1xuICAgICAgICAvLyBXZSBuZXZlciBrbm93IGlmIHRoZSBjbGljayBhY3Rpb24gd2FzIHN1Y2Nlc2Z1bGx5IGNvbXBsZXRlXG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFjdGlvbi1oaW50XCIpLmhpZGUoKTtcbiAgICAgICAgZWxlbS5maW5kKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnQtc2VuZFwiKS5zbGlkZURvd24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhY3Rpb24gaGFuZGxlci5cbiAgICAgKi9cbiAgICBvbkFjdGlvbkNvcHkgOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIik7XG4gICAgICAgIHRoaXMucHJlcGFyZUNvcHlTZWxlY3Rpb24oZWxlbSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgUVIgY29kZSBpbnNpZGUgdGhlIHRhcmdldCBlbGVtZW50LlxuICAgICAqL1xuICAgIGdlbmVyYXRlUVIgOiBmdW5jdGlvbihxckNvbnRhaW5lcikge1xuXG4gICAgICAgIHZhciBlbGVtID0gcXJDb250YWluZXIucGFyZW50cyhcIi5iaXRjb2luLWFkZHJlc3MtY29udGFpbmVyXCIpO1xuICAgICAgICB2YXIgdXJsO1xuICAgICAgICAvL3ZhciBhZGRyID0gZWxlbS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpO1xuXG4gICAgICAgIGlmKHRoaXMuY29uZmlnLnFyUmF3QWRkcmVzcykge1xuICAgICAgICAgICAgdXJsID0gZWxlbS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXJsID0gdGhpcy5idWlsZEJpdGNvaW5VUkkoZWxlbS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpLFxuICAgICAgICAgICAgZWxlbS5hdHRyKFwiZGF0YS1iYy1hbW91bnRcIiksXG4gICAgICAgICAgICBlbGVtLmF0dHIoXCJkYXRhLWJjLWxhYmVsXCIpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQoe30sIHRoaXMuY29uZmlnLnFyLCB7XG4gICAgICAgICAgICB0ZXh0OiB1cmxcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBxckNvZGUgPSBuZXcgcXJjb2RlLlFSQ29kZShxckNvbnRhaW5lci5nZXQoMCksIG9wdGlvbnMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBRUiBjb2RlIGdlbmVyYXRpb24gYWN0aW9uLlxuICAgICAqL1xuICAgIG9uQWN0aW9uUVIgOiBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIik7XG4gICAgICAgIHZhciBhZGRyID0gZWxlbS5hdHRyKFwiZGF0YS1iYy1hZGRyZXNzXCIpO1xuICAgICAgICB2YXIgcXJDb250YWluZXIgPSBlbGVtLmZpbmQoXCIuYml0Y29pbi1hZGRyZXNzLXFyLWNvbnRhaW5lclwiKTtcblxuICAgICAgICAvLyBMYXppbHkgZ2VuZXJhdGUgdGhlIFFSIGNvZGVcbiAgICAgICAgaWYocXJDb250YWluZXIuY2hpbGRyZW4oKS5zaXplKCkgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVRUihxckNvbnRhaW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtLmZpbmQoXCIuYml0Y29pbi1hY3Rpb24taGludFwiKS5oaWRlKCk7XG4gICAgICAgIGVsZW0uZmluZChcIi5iaXRjb2luLWFjdGlvbi1oaW50LXFyXCIpLnNsaWRlRG93bigpO1xuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgb25DbGljayA6IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyIGVsZW0gPSAkKGUudGFyZ2V0KS5wYXJlbnRzKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIik7XG4gICAgICAgIHRoaXMucHJlcGFyZUNvcHlTZWxlY3Rpb24oZWxlbSk7XG4gICAgfSxcblxuICAgIGluaXRVWCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5vbihcImNsaWNrXCIsIFwiLmJpdGNvaW4tYWRkcmVzcy1hY3Rpb24tY29weVwiLCAkLnByb3h5KHRoaXMub25BY3Rpb25Db3B5LCB0aGlzKSk7XG4gICAgICAgICQoZG9jdW1lbnQuYm9keSkub24oXCJjbGlja1wiLCBcIi5iaXRjb2luLWFkZHJlc3MtYWN0aW9uLXNlbmRcIiwgJC5wcm94eSh0aGlzLm9uQWN0aW9uU2VuZCwgdGhpcykpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLm9uKFwiY2xpY2tcIiwgXCIuYml0Y29pbi1hZGRyZXNzLWFjdGlvbi1xclwiLCAkLnByb3h5KHRoaXMub25BY3Rpb25RUiwgdGhpcykpO1xuICAgICAgICAkKGRvY3VtZW50LmJvZHkpLm9uKFwiY2xpY2tcIiwgXCIuYml0Y29pbi1hZGRyZXNzXCIsICQucHJveHkodGhpcy5vbkNsaWNrLCB0aGlzKSk7XG5cbiAgICAgICAgLy8gSGlkZSBhbnkgY29weSBoaW50cyB3aGVuIHVzZXIgcHJlc3NlcyBDVFJMK0NcbiAgICAgICAgLy8gb24gYW55IHBhcnQgb2YgdGhlIHBhZ2VcbiAgICAgICAgJChkb2N1bWVudC5ib2R5KS5vbihcImNvcHlcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKFwiLmJpdGNvaW4tYWN0aW9uLWhpbnQtY29weVwiKS5zbGlkZVVwKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKHRoaXMuY29uZmlnLmdlbmVyYXRlUVJFYWdlcmx5KSB7XG4gICAgICAgICAgICAkKFwiLmJpdGNvaW4tYWRkcmVzcy1jb250YWluZXJcIikuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbSA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGFkZHIgPSBlbGVtLmF0dHIoXCJkYXRhLWJjLWFkZHJlc3NcIik7XG4gICAgICAgICAgICAgICAgdmFyIHFyQ29udGFpbmVyID0gZWxlbS5maW5kKFwiLmJpdGNvaW4tYWRkcmVzcy1xci1jb250YWluZXJcIik7XG4gICAgICAgICAgICAgICAgc2VsZi5nZW5lcmF0ZVFSKHFyQ29udGFpbmVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbCB0byBpbml0aWFsaXplIHRoZSBkZXRhdWx0IGJpdGNvaW5wcmljZXMgVUkuXG4gICAgICovXG4gICAgaW5pdCA6IGZ1bmN0aW9uKF9jb25maWcpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIGlmKCFfY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbXVzdCBnaXZlIGJpdGNvaW5hZGRyZXNzIGNvbmZpZyBvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb25maWcgPSBfY29uZmlnO1xuICAgICAgICAkID0gdGhpcy5jb25maWcualF1ZXJ5IHx8IGpRdWVyeTtcbiAgICAgICAgdGhpcy5zY2FuKCk7XG4gICAgICAgIHRoaXMuaW5pdFVYKCk7XG4gICAgfVxufTtcbiIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8qKlxuICogQGZpbGVvdmVydmlld1xuICogLSBVc2luZyB0aGUgJ1FSQ29kZSBmb3IgSmF2YXNjcmlwdCBsaWJyYXJ5J1xuICogLSBGaXhlZCBkYXRhc2V0IG9mICdRUkNvZGUgZm9yIEphdmFzY3JpcHQgbGlicmFyeScgZm9yIHN1cHBvcnQgZnVsbC1zcGVjLlxuICogLSB0aGlzIGxpYnJhcnkgaGFzIG5vIGRlcGVuZGVuY2llcy5cbiAqXG4gKiBAYXV0aG9yIGRhdmlkc2hpbWpzXG4gKiBAc2VlIDxhIGhyZWY9XCJodHRwOi8vd3d3LmQtcHJvamVjdC5jb20vXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cDovL3d3dy5kLXByb2plY3QuY29tLzwvYT5cbiAqIEBzZWUgPGEgaHJlZj1cImh0dHA6Ly9qZXJvbWVldGllbm5lLmdpdGh1Yi5jb20vanF1ZXJ5LXFyY29kZS9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwOi8vamVyb21lZXRpZW5uZS5naXRodWIuY29tL2pxdWVyeS1xcmNvZGUvPC9hPlxuICovXG5cbi8qIGdsb2JhbCBkb2N1bWVudCAqL1xuXG52YXIgUVJDb2RlO1xuXG4oZnVuY3Rpb24gKCkge1xuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gUVJDb2RlIGZvciBKYXZhU2NyaXB0XG4gICAgLy9cbiAgICAvLyBDb3B5cmlnaHQgKGMpIDIwMDkgS2F6dWhpa28gQXJhc2VcbiAgICAvL1xuICAgIC8vIFVSTDogaHR0cDovL3d3dy5kLXByb2plY3QuY29tL1xuICAgIC8vXG4gICAgLy8gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlOlxuICAgIC8vICAgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAgICAvL1xuICAgIC8vIFRoZSB3b3JkIFwiUVIgQ29kZVwiIGlzIHJlZ2lzdGVyZWQgdHJhZGVtYXJrIG9mXG4gICAgLy8gREVOU08gV0FWRSBJTkNPUlBPUkFURURcbiAgICAvLyAgIGh0dHA6Ly93d3cuZGVuc28td2F2ZS5jb20vcXJjb2RlL2ZhcXBhdGVudC1lLmh0bWxcbiAgICAvL1xuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZnVuY3Rpb24gUVI4Yml0Qnl0ZShkYXRhKSB7XG4gICAgICAgIHRoaXMubW9kZSA9IFFSTW9kZS5NT0RFXzhCSVRfQllURTtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5wYXJzZWREYXRhID0gW107XG5cbiAgICAgICAgLy8gQWRkZWQgdG8gc3VwcG9ydCBVVEYtOCBDaGFyYWN0ZXJzXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJ5dGVBcnJheSA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvZGUgPSB0aGlzLmRhdGEuY2hhckNvZGVBdChpKTtcblxuICAgICAgICAgICAgaWYgKGNvZGUgPiAweDEwMDAwKSB7XG4gICAgICAgICAgICAgICAgYnl0ZUFycmF5WzBdID0gMHhGMCB8ICgoY29kZSAmIDB4MUMwMDAwKSA+Pj4gMTgpO1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVsxXSA9IDB4ODAgfCAoKGNvZGUgJiAweDNGMDAwKSA+Pj4gMTIpO1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVsyXSA9IDB4ODAgfCAoKGNvZGUgJiAweEZDMCkgPj4+IDYpO1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVszXSA9IDB4ODAgfCAoY29kZSAmIDB4M0YpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb2RlID4gMHg4MDApIHtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMF0gPSAweEUwIHwgKChjb2RlICYgMHhGMDAwKSA+Pj4gMTIpO1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVsxXSA9IDB4ODAgfCAoKGNvZGUgJiAweEZDMCkgPj4+IDYpO1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVsyXSA9IDB4ODAgfCAoY29kZSAmIDB4M0YpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb2RlID4gMHg4MCkge1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVswXSA9IDB4QzAgfCAoKGNvZGUgJiAweDdDMCkgPj4+IDYpO1xuICAgICAgICAgICAgICAgIGJ5dGVBcnJheVsxXSA9IDB4ODAgfCAoY29kZSAmIDB4M0YpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBieXRlQXJyYXlbMF0gPSBjb2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnBhcnNlZERhdGEucHVzaChieXRlQXJyYXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wYXJzZWREYXRhID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShbXSwgdGhpcy5wYXJzZWREYXRhKTtcblxuICAgICAgICBpZiAodGhpcy5wYXJzZWREYXRhLmxlbmd0aCAhPSB0aGlzLmRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnBhcnNlZERhdGEudW5zaGlmdCgxOTEpO1xuICAgICAgICAgICAgdGhpcy5wYXJzZWREYXRhLnVuc2hpZnQoMTg3KTtcbiAgICAgICAgICAgIHRoaXMucGFyc2VkRGF0YS51bnNoaWZ0KDIzOSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBRUjhiaXRCeXRlLnByb3RvdHlwZSA9IHtcbiAgICAgICAgZ2V0TGVuZ3RoOiBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZWREYXRhLmxlbmd0aDtcbiAgICAgICAgfSxcbiAgICAgICAgd3JpdGU6IGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5wYXJzZWREYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGJ1ZmZlci5wdXQodGhpcy5wYXJzZWREYXRhW2ldLCA4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBRUkNvZGVNb2RlbCh0eXBlTnVtYmVyLCBlcnJvckNvcnJlY3RMZXZlbCkge1xuICAgICAgICB0aGlzLnR5cGVOdW1iZXIgPSB0eXBlTnVtYmVyO1xuICAgICAgICB0aGlzLmVycm9yQ29ycmVjdExldmVsID0gZXJyb3JDb3JyZWN0TGV2ZWw7XG4gICAgICAgIHRoaXMubW9kdWxlcyA9IG51bGw7XG4gICAgICAgIHRoaXMubW9kdWxlQ291bnQgPSAwO1xuICAgICAgICB0aGlzLmRhdGFDYWNoZSA9IG51bGw7XG4gICAgICAgIHRoaXMuZGF0YUxpc3QgPSBbXTtcbiAgICB9XG5cbiAgICBRUkNvZGVNb2RlbC5wcm90b3R5cGU9e2FkZERhdGE6ZnVuY3Rpb24oZGF0YSl7dmFyIG5ld0RhdGE9bmV3IFFSOGJpdEJ5dGUoZGF0YSk7dGhpcy5kYXRhTGlzdC5wdXNoKG5ld0RhdGEpO3RoaXMuZGF0YUNhY2hlPW51bGw7fSxpc0Rhcms6ZnVuY3Rpb24ocm93LGNvbCl7aWYocm93PDB8fHRoaXMubW9kdWxlQ291bnQ8PXJvd3x8Y29sPDB8fHRoaXMubW9kdWxlQ291bnQ8PWNvbCl7dGhyb3cgbmV3IEVycm9yKHJvdytcIixcIitjb2wpO31cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVzW3Jvd11bY29sXTt9LGdldE1vZHVsZUNvdW50OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMubW9kdWxlQ291bnQ7fSxtYWtlOmZ1bmN0aW9uKCl7dGhpcy5tYWtlSW1wbChmYWxzZSx0aGlzLmdldEJlc3RNYXNrUGF0dGVybigpKTt9LG1ha2VJbXBsOmZ1bmN0aW9uKHRlc3QsbWFza1BhdHRlcm4pe3RoaXMubW9kdWxlQ291bnQ9dGhpcy50eXBlTnVtYmVyKjQrMTc7dGhpcy5tb2R1bGVzPW5ldyBBcnJheSh0aGlzLm1vZHVsZUNvdW50KTtmb3IodmFyIHJvdz0wO3Jvdzx0aGlzLm1vZHVsZUNvdW50O3JvdysrKXt0aGlzLm1vZHVsZXNbcm93XT1uZXcgQXJyYXkodGhpcy5tb2R1bGVDb3VudCk7Zm9yKHZhciBjb2w9MDtjb2w8dGhpcy5tb2R1bGVDb3VudDtjb2wrKyl7dGhpcy5tb2R1bGVzW3Jvd11bY29sXT1udWxsO319XG4gICAgdGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsMCk7dGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKHRoaXMubW9kdWxlQ291bnQtNywwKTt0aGlzLnNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm4oMCx0aGlzLm1vZHVsZUNvdW50LTcpO3RoaXMuc2V0dXBQb3NpdGlvbkFkanVzdFBhdHRlcm4oKTt0aGlzLnNldHVwVGltaW5nUGF0dGVybigpO3RoaXMuc2V0dXBUeXBlSW5mbyh0ZXN0LG1hc2tQYXR0ZXJuKTtpZih0aGlzLnR5cGVOdW1iZXI+PTcpe3RoaXMuc2V0dXBUeXBlTnVtYmVyKHRlc3QpO31cbiAgICBpZih0aGlzLmRhdGFDYWNoZT09bnVsbCl7dGhpcy5kYXRhQ2FjaGU9UVJDb2RlTW9kZWwuY3JlYXRlRGF0YSh0aGlzLnR5cGVOdW1iZXIsdGhpcy5lcnJvckNvcnJlY3RMZXZlbCx0aGlzLmRhdGFMaXN0KTt9XG4gICAgdGhpcy5tYXBEYXRhKHRoaXMuZGF0YUNhY2hlLG1hc2tQYXR0ZXJuKTt9LHNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm46ZnVuY3Rpb24ocm93LGNvbCl7Zm9yKHZhciByPS0xO3I8PTc7cisrKXtpZihyb3crcjw9LTF8fHRoaXMubW9kdWxlQ291bnQ8PXJvdytyKWNvbnRpbnVlO2Zvcih2YXIgYz0tMTtjPD03O2MrKyl7aWYoY29sK2M8PS0xfHx0aGlzLm1vZHVsZUNvdW50PD1jb2wrYyljb250aW51ZTtpZigoMDw9ciYmcjw9NiYmKGM9PTB8fGM9PTYpKXx8KDA8PWMmJmM8PTYmJihyPT0wfHxyPT02KSl8fCgyPD1yJiZyPD00JiYyPD1jJiZjPD00KSl7dGhpcy5tb2R1bGVzW3JvdytyXVtjb2wrY109dHJ1ZTt9ZWxzZXt0aGlzLm1vZHVsZXNbcm93K3JdW2NvbCtjXT1mYWxzZTt9fX19LGdldEJlc3RNYXNrUGF0dGVybjpmdW5jdGlvbigpe3ZhciBtaW5Mb3N0UG9pbnQ9MDt2YXIgcGF0dGVybj0wO2Zvcih2YXIgaT0wO2k8ODtpKyspe3RoaXMubWFrZUltcGwodHJ1ZSxpKTt2YXIgbG9zdFBvaW50PVFSVXRpbC5nZXRMb3N0UG9pbnQodGhpcyk7aWYoaT09MHx8bWluTG9zdFBvaW50Pmxvc3RQb2ludCl7bWluTG9zdFBvaW50PWxvc3RQb2ludDtwYXR0ZXJuPWk7fX1cbiAgICByZXR1cm4gcGF0dGVybjt9LGNyZWF0ZU1vdmllQ2xpcDpmdW5jdGlvbih0YXJnZXRfbWMsaW5zdGFuY2VfbmFtZSxkZXB0aCl7dmFyIHFyX21jPXRhcmdldF9tYy5jcmVhdGVFbXB0eU1vdmllQ2xpcChpbnN0YW5jZV9uYW1lLGRlcHRoKTt2YXIgY3M9MTt0aGlzLm1ha2UoKTtmb3IodmFyIHJvdz0wO3Jvdzx0aGlzLm1vZHVsZXMubGVuZ3RoO3JvdysrKXt2YXIgeT1yb3cqY3M7Zm9yKHZhciBjb2w9MDtjb2w8dGhpcy5tb2R1bGVzW3Jvd10ubGVuZ3RoO2NvbCsrKXt2YXIgeD1jb2wqY3M7dmFyIGRhcms9dGhpcy5tb2R1bGVzW3Jvd11bY29sXTtpZihkYXJrKXtxcl9tYy5iZWdpbkZpbGwoMCwxMDApO3FyX21jLm1vdmVUbyh4LHkpO3FyX21jLmxpbmVUbyh4K2NzLHkpO3FyX21jLmxpbmVUbyh4K2NzLHkrY3MpO3FyX21jLmxpbmVUbyh4LHkrY3MpO3FyX21jLmVuZEZpbGwoKTt9fX1cbiAgICByZXR1cm4gcXJfbWM7fSxzZXR1cFRpbWluZ1BhdHRlcm46ZnVuY3Rpb24oKXtmb3IodmFyIHI9ODtyPHRoaXMubW9kdWxlQ291bnQtODtyKyspe2lmKHRoaXMubW9kdWxlc1tyXVs2XSE9bnVsbCl7Y29udGludWU7fVxuICAgIHRoaXMubW9kdWxlc1tyXVs2XT0ociUyPT0wKTt9XG4gICAgZm9yKHZhciBjPTg7Yzx0aGlzLm1vZHVsZUNvdW50LTg7YysrKXtpZih0aGlzLm1vZHVsZXNbNl1bY10hPW51bGwpe2NvbnRpbnVlO31cbiAgICB0aGlzLm1vZHVsZXNbNl1bY109KGMlMj09MCk7fX0sc2V0dXBQb3NpdGlvbkFkanVzdFBhdHRlcm46ZnVuY3Rpb24oKXt2YXIgcG9zPVFSVXRpbC5nZXRQYXR0ZXJuUG9zaXRpb24odGhpcy50eXBlTnVtYmVyKTtmb3IodmFyIGk9MDtpPHBvcy5sZW5ndGg7aSsrKXtmb3IodmFyIGo9MDtqPHBvcy5sZW5ndGg7aisrKXt2YXIgcm93PXBvc1tpXTt2YXIgY29sPXBvc1tqXTtpZih0aGlzLm1vZHVsZXNbcm93XVtjb2xdIT1udWxsKXtjb250aW51ZTt9XG4gICAgZm9yKHZhciByPS0yO3I8PTI7cisrKXtmb3IodmFyIGM9LTI7Yzw9MjtjKyspe2lmKHI9PS0yfHxyPT0yfHxjPT0tMnx8Yz09Mnx8KHI9PTAmJmM9PTApKXt0aGlzLm1vZHVsZXNbcm93K3JdW2NvbCtjXT10cnVlO31lbHNle3RoaXMubW9kdWxlc1tyb3crcl1bY29sK2NdPWZhbHNlO319fX19fSxzZXR1cFR5cGVOdW1iZXI6ZnVuY3Rpb24odGVzdCl7dmFyIGJpdHM9UVJVdGlsLmdldEJDSFR5cGVOdW1iZXIodGhpcy50eXBlTnVtYmVyKTtmb3IodmFyIGk9MDtpPDE4O2krKyl7dmFyIG1vZD0oIXRlc3QmJigoYml0cz4+aSkmMSk9PTEpO3RoaXMubW9kdWxlc1tNYXRoLmZsb29yKGkvMyldW2klMyt0aGlzLm1vZHVsZUNvdW50LTgtM109bW9kO31cbiAgICBmb3IodmFyIGk9MDtpPDE4O2krKyl7dmFyIG1vZD0oIXRlc3QmJigoYml0cz4+aSkmMSk9PTEpO3RoaXMubW9kdWxlc1tpJTMrdGhpcy5tb2R1bGVDb3VudC04LTNdW01hdGguZmxvb3IoaS8zKV09bW9kO319LHNldHVwVHlwZUluZm86ZnVuY3Rpb24odGVzdCxtYXNrUGF0dGVybil7dmFyIGRhdGE9KHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWw8PDMpfG1hc2tQYXR0ZXJuO3ZhciBiaXRzPVFSVXRpbC5nZXRCQ0hUeXBlSW5mbyhkYXRhKTtmb3IodmFyIGk9MDtpPDE1O2krKyl7dmFyIG1vZD0oIXRlc3QmJigoYml0cz4+aSkmMSk9PTEpO2lmKGk8Nil7dGhpcy5tb2R1bGVzW2ldWzhdPW1vZDt9ZWxzZSBpZihpPDgpe3RoaXMubW9kdWxlc1tpKzFdWzhdPW1vZDt9ZWxzZXt0aGlzLm1vZHVsZXNbdGhpcy5tb2R1bGVDb3VudC0xNStpXVs4XT1tb2Q7fX1cbiAgICBmb3IodmFyIGk9MDtpPDE1O2krKyl7dmFyIG1vZD0oIXRlc3QmJigoYml0cz4+aSkmMSk9PTEpO2lmKGk8OCl7dGhpcy5tb2R1bGVzWzhdW3RoaXMubW9kdWxlQ291bnQtaS0xXT1tb2Q7fWVsc2UgaWYoaTw5KXt0aGlzLm1vZHVsZXNbOF1bMTUtaS0xKzFdPW1vZDt9ZWxzZXt0aGlzLm1vZHVsZXNbOF1bMTUtaS0xXT1tb2Q7fX1cbiAgICB0aGlzLm1vZHVsZXNbdGhpcy5tb2R1bGVDb3VudC04XVs4XT0oIXRlc3QpO30sbWFwRGF0YTpmdW5jdGlvbihkYXRhLG1hc2tQYXR0ZXJuKXt2YXIgaW5jPS0xO3ZhciByb3c9dGhpcy5tb2R1bGVDb3VudC0xO3ZhciBiaXRJbmRleD03O3ZhciBieXRlSW5kZXg9MDtmb3IodmFyIGNvbD10aGlzLm1vZHVsZUNvdW50LTE7Y29sPjA7Y29sLT0yKXtpZihjb2w9PTYpY29sLS07d2hpbGUodHJ1ZSl7Zm9yKHZhciBjPTA7YzwyO2MrKyl7aWYodGhpcy5tb2R1bGVzW3Jvd11bY29sLWNdPT1udWxsKXt2YXIgZGFyaz1mYWxzZTtpZihieXRlSW5kZXg8ZGF0YS5sZW5ndGgpe2Rhcms9KCgoZGF0YVtieXRlSW5kZXhdPj4+Yml0SW5kZXgpJjEpPT0xKTt9XG4gICAgdmFyIG1hc2s9UVJVdGlsLmdldE1hc2sobWFza1BhdHRlcm4scm93LGNvbC1jKTtpZihtYXNrKXtkYXJrPSFkYXJrO31cbiAgICB0aGlzLm1vZHVsZXNbcm93XVtjb2wtY109ZGFyaztiaXRJbmRleC0tO2lmKGJpdEluZGV4PT0tMSl7Ynl0ZUluZGV4Kys7Yml0SW5kZXg9Nzt9fX1cbiAgICByb3crPWluYztpZihyb3c8MHx8dGhpcy5tb2R1bGVDb3VudDw9cm93KXtyb3ctPWluYztpbmM9LWluYzticmVhazt9fX19fTtRUkNvZGVNb2RlbC5QQUQwPTB4RUM7UVJDb2RlTW9kZWwuUEFEMT0weDExO1FSQ29kZU1vZGVsLmNyZWF0ZURhdGE9ZnVuY3Rpb24odHlwZU51bWJlcixlcnJvckNvcnJlY3RMZXZlbCxkYXRhTGlzdCl7dmFyIHJzQmxvY2tzPVFSUlNCbG9jay5nZXRSU0Jsb2Nrcyh0eXBlTnVtYmVyLGVycm9yQ29ycmVjdExldmVsKTt2YXIgYnVmZmVyPW5ldyBRUkJpdEJ1ZmZlcigpO2Zvcih2YXIgaT0wO2k8ZGF0YUxpc3QubGVuZ3RoO2krKyl7dmFyIGRhdGE9ZGF0YUxpc3RbaV07YnVmZmVyLnB1dChkYXRhLm1vZGUsNCk7YnVmZmVyLnB1dChkYXRhLmdldExlbmd0aCgpLFFSVXRpbC5nZXRMZW5ndGhJbkJpdHMoZGF0YS5tb2RlLHR5cGVOdW1iZXIpKTtkYXRhLndyaXRlKGJ1ZmZlcik7fVxuICAgIHZhciB0b3RhbERhdGFDb3VudD0wO2Zvcih2YXIgaT0wO2k8cnNCbG9ja3MubGVuZ3RoO2krKyl7dG90YWxEYXRhQ291bnQrPXJzQmxvY2tzW2ldLmRhdGFDb3VudDt9XG4gICAgaWYoYnVmZmVyLmdldExlbmd0aEluQml0cygpPnRvdGFsRGF0YUNvdW50Kjgpe3Rocm93IG5ldyBFcnJvcihcImNvZGUgbGVuZ3RoIG92ZXJmbG93LiAoXCJcbiAgICArYnVmZmVyLmdldExlbmd0aEluQml0cygpXG4gICAgK1wiPlwiXG4gICAgK3RvdGFsRGF0YUNvdW50KjhcbiAgICArXCIpXCIpO31cbiAgICBpZihidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCkrNDw9dG90YWxEYXRhQ291bnQqOCl7YnVmZmVyLnB1dCgwLDQpO31cbiAgICB3aGlsZShidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCklOCE9MCl7YnVmZmVyLnB1dEJpdChmYWxzZSk7fVxuICAgIHdoaWxlKHRydWUpe2lmKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKT49dG90YWxEYXRhQ291bnQqOCl7YnJlYWs7fVxuICAgIGJ1ZmZlci5wdXQoUVJDb2RlTW9kZWwuUEFEMCw4KTtpZihidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCk+PXRvdGFsRGF0YUNvdW50Kjgpe2JyZWFrO31cbiAgICBidWZmZXIucHV0KFFSQ29kZU1vZGVsLlBBRDEsOCk7fVxuICAgIHJldHVybiBRUkNvZGVNb2RlbC5jcmVhdGVCeXRlcyhidWZmZXIscnNCbG9ja3MpO307UVJDb2RlTW9kZWwuY3JlYXRlQnl0ZXM9ZnVuY3Rpb24oYnVmZmVyLHJzQmxvY2tzKXt2YXIgb2Zmc2V0PTA7dmFyIG1heERjQ291bnQ9MDt2YXIgbWF4RWNDb3VudD0wO3ZhciBkY2RhdGE9bmV3IEFycmF5KHJzQmxvY2tzLmxlbmd0aCk7dmFyIGVjZGF0YT1uZXcgQXJyYXkocnNCbG9ja3MubGVuZ3RoKTtmb3IodmFyIHI9MDtyPHJzQmxvY2tzLmxlbmd0aDtyKyspe3ZhciBkY0NvdW50PXJzQmxvY2tzW3JdLmRhdGFDb3VudDt2YXIgZWNDb3VudD1yc0Jsb2Nrc1tyXS50b3RhbENvdW50LWRjQ291bnQ7bWF4RGNDb3VudD1NYXRoLm1heChtYXhEY0NvdW50LGRjQ291bnQpO21heEVjQ291bnQ9TWF0aC5tYXgobWF4RWNDb3VudCxlY0NvdW50KTtkY2RhdGFbcl09bmV3IEFycmF5KGRjQ291bnQpO2Zvcih2YXIgaT0wO2k8ZGNkYXRhW3JdLmxlbmd0aDtpKyspe2RjZGF0YVtyXVtpXT0weGZmJmJ1ZmZlci5idWZmZXJbaStvZmZzZXRdO31cbiAgICBvZmZzZXQrPWRjQ291bnQ7dmFyIHJzUG9seT1RUlV0aWwuZ2V0RXJyb3JDb3JyZWN0UG9seW5vbWlhbChlY0NvdW50KTt2YXIgcmF3UG9seT1uZXcgUVJQb2x5bm9taWFsKGRjZGF0YVtyXSxyc1BvbHkuZ2V0TGVuZ3RoKCktMSk7dmFyIG1vZFBvbHk9cmF3UG9seS5tb2QocnNQb2x5KTtlY2RhdGFbcl09bmV3IEFycmF5KHJzUG9seS5nZXRMZW5ndGgoKS0xKTtmb3IodmFyIGk9MDtpPGVjZGF0YVtyXS5sZW5ndGg7aSsrKXt2YXIgbW9kSW5kZXg9aSttb2RQb2x5LmdldExlbmd0aCgpLWVjZGF0YVtyXS5sZW5ndGg7ZWNkYXRhW3JdW2ldPShtb2RJbmRleD49MCk/bW9kUG9seS5nZXQobW9kSW5kZXgpOjA7fX1cbiAgICB2YXIgdG90YWxDb2RlQ291bnQ9MDtmb3IodmFyIGk9MDtpPHJzQmxvY2tzLmxlbmd0aDtpKyspe3RvdGFsQ29kZUNvdW50Kz1yc0Jsb2Nrc1tpXS50b3RhbENvdW50O31cbiAgICB2YXIgZGF0YT1uZXcgQXJyYXkodG90YWxDb2RlQ291bnQpO3ZhciBpbmRleD0wO2Zvcih2YXIgaT0wO2k8bWF4RGNDb3VudDtpKyspe2Zvcih2YXIgcj0wO3I8cnNCbG9ja3MubGVuZ3RoO3IrKyl7aWYoaTxkY2RhdGFbcl0ubGVuZ3RoKXtkYXRhW2luZGV4KytdPWRjZGF0YVtyXVtpXTt9fX1cbiAgICBmb3IodmFyIGk9MDtpPG1heEVjQ291bnQ7aSsrKXtmb3IodmFyIHI9MDtyPHJzQmxvY2tzLmxlbmd0aDtyKyspe2lmKGk8ZWNkYXRhW3JdLmxlbmd0aCl7ZGF0YVtpbmRleCsrXT1lY2RhdGFbcl1baV07fX19XG4gICAgcmV0dXJuIGRhdGE7fTt2YXIgUVJNb2RlPXtNT0RFX05VTUJFUjoxPDwwLE1PREVfQUxQSEFfTlVNOjE8PDEsTU9ERV84QklUX0JZVEU6MTw8MixNT0RFX0tBTkpJOjE8PDN9O3ZhciBRUkVycm9yQ29ycmVjdExldmVsPXtMOjEsTTowLFE6MyxIOjJ9O3ZhciBRUk1hc2tQYXR0ZXJuPXtQQVRURVJOMDAwOjAsUEFUVEVSTjAwMToxLFBBVFRFUk4wMTA6MixQQVRURVJOMDExOjMsUEFUVEVSTjEwMDo0LFBBVFRFUk4xMDE6NSxQQVRURVJOMTEwOjYsUEFUVEVSTjExMTo3fTt2YXIgUVJVdGlsPXtQQVRURVJOX1BPU0lUSU9OX1RBQkxFOltbXSxbNiwxOF0sWzYsMjJdLFs2LDI2XSxbNiwzMF0sWzYsMzRdLFs2LDIyLDM4XSxbNiwyNCw0Ml0sWzYsMjYsNDZdLFs2LDI4LDUwXSxbNiwzMCw1NF0sWzYsMzIsNThdLFs2LDM0LDYyXSxbNiwyNiw0Niw2Nl0sWzYsMjYsNDgsNzBdLFs2LDI2LDUwLDc0XSxbNiwzMCw1NCw3OF0sWzYsMzAsNTYsODJdLFs2LDMwLDU4LDg2XSxbNiwzNCw2Miw5MF0sWzYsMjgsNTAsNzIsOTRdLFs2LDI2LDUwLDc0LDk4XSxbNiwzMCw1NCw3OCwxMDJdLFs2LDI4LDU0LDgwLDEwNl0sWzYsMzIsNTgsODQsMTEwXSxbNiwzMCw1OCw4NiwxMTRdLFs2LDM0LDYyLDkwLDExOF0sWzYsMjYsNTAsNzQsOTgsMTIyXSxbNiwzMCw1NCw3OCwxMDIsMTI2XSxbNiwyNiw1Miw3OCwxMDQsMTMwXSxbNiwzMCw1Niw4MiwxMDgsMTM0XSxbNiwzNCw2MCw4NiwxMTIsMTM4XSxbNiwzMCw1OCw4NiwxMTQsMTQyXSxbNiwzNCw2Miw5MCwxMTgsMTQ2XSxbNiwzMCw1NCw3OCwxMDIsMTI2LDE1MF0sWzYsMjQsNTAsNzYsMTAyLDEyOCwxNTRdLFs2LDI4LDU0LDgwLDEwNiwxMzIsMTU4XSxbNiwzMiw1OCw4NCwxMTAsMTM2LDE2Ml0sWzYsMjYsNTQsODIsMTEwLDEzOCwxNjZdLFs2LDMwLDU4LDg2LDExNCwxNDIsMTcwXV0sRzE1OigxPDwxMCl8KDE8PDgpfCgxPDw1KXwoMTw8NCl8KDE8PDIpfCgxPDwxKXwoMTw8MCksRzE4OigxPDwxMil8KDE8PDExKXwoMTw8MTApfCgxPDw5KXwoMTw8OCl8KDE8PDUpfCgxPDwyKXwoMTw8MCksRzE1X01BU0s6KDE8PDE0KXwoMTw8MTIpfCgxPDwxMCl8KDE8PDQpfCgxPDwxKSxnZXRCQ0hUeXBlSW5mbzpmdW5jdGlvbihkYXRhKXt2YXIgZD1kYXRhPDwxMDt3aGlsZShRUlV0aWwuZ2V0QkNIRGlnaXQoZCktUVJVdGlsLmdldEJDSERpZ2l0KFFSVXRpbC5HMTUpPj0wKXtkXj0oUVJVdGlsLkcxNTw8KFFSVXRpbC5nZXRCQ0hEaWdpdChkKS1RUlV0aWwuZ2V0QkNIRGlnaXQoUVJVdGlsLkcxNSkpKTt9XG4gICAgcmV0dXJuKChkYXRhPDwxMCl8ZCleUVJVdGlsLkcxNV9NQVNLO30sZ2V0QkNIVHlwZU51bWJlcjpmdW5jdGlvbihkYXRhKXt2YXIgZD1kYXRhPDwxMjt3aGlsZShRUlV0aWwuZ2V0QkNIRGlnaXQoZCktUVJVdGlsLmdldEJDSERpZ2l0KFFSVXRpbC5HMTgpPj0wKXtkXj0oUVJVdGlsLkcxODw8KFFSVXRpbC5nZXRCQ0hEaWdpdChkKS1RUlV0aWwuZ2V0QkNIRGlnaXQoUVJVdGlsLkcxOCkpKTt9XG4gICAgcmV0dXJuKGRhdGE8PDEyKXxkO30sZ2V0QkNIRGlnaXQ6ZnVuY3Rpb24oZGF0YSl7dmFyIGRpZ2l0PTA7d2hpbGUoZGF0YSE9MCl7ZGlnaXQrKztkYXRhPj4+PTE7fVxuICAgIHJldHVybiBkaWdpdDt9LGdldFBhdHRlcm5Qb3NpdGlvbjpmdW5jdGlvbih0eXBlTnVtYmVyKXtyZXR1cm4gUVJVdGlsLlBBVFRFUk5fUE9TSVRJT05fVEFCTEVbdHlwZU51bWJlci0xXTt9LGdldE1hc2s6ZnVuY3Rpb24obWFza1BhdHRlcm4saSxqKXtzd2l0Y2gobWFza1BhdHRlcm4pe2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDAwOnJldHVybihpK2opJTI9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMDE6cmV0dXJuIGklMj09MDtjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAxMDpyZXR1cm4gaiUzPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDExOnJldHVybihpK2opJTM9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMDA6cmV0dXJuKE1hdGguZmxvb3IoaS8yKStNYXRoLmZsb29yKGovMykpJTI9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMDE6cmV0dXJuKGkqaiklMisoaSpqKSUzPT0wO2Nhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTEwOnJldHVybigoaSpqKSUyKyhpKmopJTMpJTI9PTA7Y2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMTE6cmV0dXJuKChpKmopJTMrKGkraiklMiklMj09MDtkZWZhdWx0OnRocm93IG5ldyBFcnJvcihcImJhZCBtYXNrUGF0dGVybjpcIittYXNrUGF0dGVybik7fX0sZ2V0RXJyb3JDb3JyZWN0UG9seW5vbWlhbDpmdW5jdGlvbihlcnJvckNvcnJlY3RMZW5ndGgpe3ZhciBhPW5ldyBRUlBvbHlub21pYWwoWzFdLDApO2Zvcih2YXIgaT0wO2k8ZXJyb3JDb3JyZWN0TGVuZ3RoO2krKyl7YT1hLm11bHRpcGx5KG5ldyBRUlBvbHlub21pYWwoWzEsUVJNYXRoLmdleHAoaSldLDApKTt9XG4gICAgcmV0dXJuIGE7fSxnZXRMZW5ndGhJbkJpdHM6ZnVuY3Rpb24obW9kZSx0eXBlKXtpZigxPD10eXBlJiZ0eXBlPDEwKXtzd2l0Y2gobW9kZSl7Y2FzZSBRUk1vZGUuTU9ERV9OVU1CRVI6cmV0dXJuIDEwO2Nhc2UgUVJNb2RlLk1PREVfQUxQSEFfTlVNOnJldHVybiA5O2Nhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFOnJldHVybiA4O2Nhc2UgUVJNb2RlLk1PREVfS0FOSkk6cmV0dXJuIDg7ZGVmYXVsdDp0aHJvdyBuZXcgRXJyb3IoXCJtb2RlOlwiK21vZGUpO319ZWxzZSBpZih0eXBlPDI3KXtzd2l0Y2gobW9kZSl7Y2FzZSBRUk1vZGUuTU9ERV9OVU1CRVI6cmV0dXJuIDEyO2Nhc2UgUVJNb2RlLk1PREVfQUxQSEFfTlVNOnJldHVybiAxMTtjYXNlIFFSTW9kZS5NT0RFXzhCSVRfQllURTpyZXR1cm4gMTY7Y2FzZSBRUk1vZGUuTU9ERV9LQU5KSTpyZXR1cm4gMTA7ZGVmYXVsdDp0aHJvdyBuZXcgRXJyb3IoXCJtb2RlOlwiK21vZGUpO319ZWxzZSBpZih0eXBlPDQxKXtzd2l0Y2gobW9kZSl7Y2FzZSBRUk1vZGUuTU9ERV9OVU1CRVI6cmV0dXJuIDE0O2Nhc2UgUVJNb2RlLk1PREVfQUxQSEFfTlVNOnJldHVybiAxMztjYXNlIFFSTW9kZS5NT0RFXzhCSVRfQllURTpyZXR1cm4gMTY7Y2FzZSBRUk1vZGUuTU9ERV9LQU5KSTpyZXR1cm4gMTI7ZGVmYXVsdDp0aHJvdyBuZXcgRXJyb3IoXCJtb2RlOlwiK21vZGUpO319ZWxzZXt0aHJvdyBuZXcgRXJyb3IoXCJ0eXBlOlwiK3R5cGUpO319LGdldExvc3RQb2ludDpmdW5jdGlvbihxckNvZGUpe3ZhciBtb2R1bGVDb3VudD1xckNvZGUuZ2V0TW9kdWxlQ291bnQoKTt2YXIgbG9zdFBvaW50PTA7Zm9yKHZhciByb3c9MDtyb3c8bW9kdWxlQ291bnQ7cm93Kyspe2Zvcih2YXIgY29sPTA7Y29sPG1vZHVsZUNvdW50O2NvbCsrKXt2YXIgc2FtZUNvdW50PTA7dmFyIGRhcms9cXJDb2RlLmlzRGFyayhyb3csY29sKTtmb3IodmFyIHI9LTE7cjw9MTtyKyspe2lmKHJvdytyPDB8fG1vZHVsZUNvdW50PD1yb3crcil7Y29udGludWU7fVxuICAgIGZvcih2YXIgYz0tMTtjPD0xO2MrKyl7aWYoY29sK2M8MHx8bW9kdWxlQ291bnQ8PWNvbCtjKXtjb250aW51ZTt9XG4gICAgaWYocj09MCYmYz09MCl7Y29udGludWU7fVxuICAgIGlmKGRhcms9PXFyQ29kZS5pc0Rhcmsocm93K3IsY29sK2MpKXtzYW1lQ291bnQrKzt9fX1cbiAgICBpZihzYW1lQ291bnQ+NSl7bG9zdFBvaW50Kz0oMytzYW1lQ291bnQtNSk7fX19XG4gICAgZm9yKHZhciByb3c9MDtyb3c8bW9kdWxlQ291bnQtMTtyb3crKyl7Zm9yKHZhciBjb2w9MDtjb2w8bW9kdWxlQ291bnQtMTtjb2wrKyl7dmFyIGNvdW50PTA7aWYocXJDb2RlLmlzRGFyayhyb3csY29sKSljb3VudCsrO2lmKHFyQ29kZS5pc0Rhcmsocm93KzEsY29sKSljb3VudCsrO2lmKHFyQ29kZS5pc0Rhcmsocm93LGNvbCsxKSljb3VudCsrO2lmKHFyQ29kZS5pc0Rhcmsocm93KzEsY29sKzEpKWNvdW50Kys7aWYoY291bnQ9PTB8fGNvdW50PT00KXtsb3N0UG9pbnQrPTM7fX19XG4gICAgZm9yKHZhciByb3c9MDtyb3c8bW9kdWxlQ291bnQ7cm93Kyspe2Zvcih2YXIgY29sPTA7Y29sPG1vZHVsZUNvdW50LTY7Y29sKyspe2lmKHFyQ29kZS5pc0Rhcmsocm93LGNvbCkmJiFxckNvZGUuaXNEYXJrKHJvdyxjb2wrMSkmJnFyQ29kZS5pc0Rhcmsocm93LGNvbCsyKSYmcXJDb2RlLmlzRGFyayhyb3csY29sKzMpJiZxckNvZGUuaXNEYXJrKHJvdyxjb2wrNCkmJiFxckNvZGUuaXNEYXJrKHJvdyxjb2wrNSkmJnFyQ29kZS5pc0Rhcmsocm93LGNvbCs2KSl7bG9zdFBvaW50Kz00MDt9fX1cbiAgICBmb3IodmFyIGNvbD0wO2NvbDxtb2R1bGVDb3VudDtjb2wrKyl7Zm9yKHZhciByb3c9MDtyb3c8bW9kdWxlQ291bnQtNjtyb3crKyl7aWYocXJDb2RlLmlzRGFyayhyb3csY29sKSYmIXFyQ29kZS5pc0Rhcmsocm93KzEsY29sKSYmcXJDb2RlLmlzRGFyayhyb3crMixjb2wpJiZxckNvZGUuaXNEYXJrKHJvdyszLGNvbCkmJnFyQ29kZS5pc0Rhcmsocm93KzQsY29sKSYmIXFyQ29kZS5pc0Rhcmsocm93KzUsY29sKSYmcXJDb2RlLmlzRGFyayhyb3crNixjb2wpKXtsb3N0UG9pbnQrPTQwO319fVxuICAgIHZhciBkYXJrQ291bnQ9MDtmb3IodmFyIGNvbD0wO2NvbDxtb2R1bGVDb3VudDtjb2wrKyl7Zm9yKHZhciByb3c9MDtyb3c8bW9kdWxlQ291bnQ7cm93Kyspe2lmKHFyQ29kZS5pc0Rhcmsocm93LGNvbCkpe2RhcmtDb3VudCsrO319fVxuICAgIHZhciByYXRpbz1NYXRoLmFicygxMDAqZGFya0NvdW50L21vZHVsZUNvdW50L21vZHVsZUNvdW50LTUwKS81O2xvc3RQb2ludCs9cmF0aW8qMTA7cmV0dXJuIGxvc3RQb2ludDt9fTt2YXIgUVJNYXRoPXtnbG9nOmZ1bmN0aW9uKG4pe2lmKG48MSl7dGhyb3cgbmV3IEVycm9yKFwiZ2xvZyhcIituK1wiKVwiKTt9XG4gICAgcmV0dXJuIFFSTWF0aC5MT0dfVEFCTEVbbl07fSxnZXhwOmZ1bmN0aW9uKG4pe3doaWxlKG48MCl7bis9MjU1O31cbiAgICB3aGlsZShuPj0yNTYpe24tPTI1NTt9XG4gICAgcmV0dXJuIFFSTWF0aC5FWFBfVEFCTEVbbl07fSxFWFBfVEFCTEU6bmV3IEFycmF5KDI1NiksTE9HX1RBQkxFOm5ldyBBcnJheSgyNTYpfTtmb3IodmFyIGk9MDtpPDg7aSsrKXtRUk1hdGguRVhQX1RBQkxFW2ldPTE8PGk7fVxuICAgIGZvcih2YXIgaT04O2k8MjU2O2krKyl7UVJNYXRoLkVYUF9UQUJMRVtpXT1RUk1hdGguRVhQX1RBQkxFW2ktNF1eUVJNYXRoLkVYUF9UQUJMRVtpLTVdXlFSTWF0aC5FWFBfVEFCTEVbaS02XV5RUk1hdGguRVhQX1RBQkxFW2ktOF07fVxuICAgIGZvcih2YXIgaT0wO2k8MjU1O2krKyl7UVJNYXRoLkxPR19UQUJMRVtRUk1hdGguRVhQX1RBQkxFW2ldXT1pO31cbiAgICBmdW5jdGlvbiBRUlBvbHlub21pYWwobnVtLHNoaWZ0KXtpZihudW0ubGVuZ3RoPT11bmRlZmluZWQpe3Rocm93IG5ldyBFcnJvcihudW0ubGVuZ3RoK1wiL1wiK3NoaWZ0KTt9XG4gICAgdmFyIG9mZnNldD0wO3doaWxlKG9mZnNldDxudW0ubGVuZ3RoJiZudW1bb2Zmc2V0XT09MCl7b2Zmc2V0Kys7fVxuICAgIHRoaXMubnVtPW5ldyBBcnJheShudW0ubGVuZ3RoLW9mZnNldCtzaGlmdCk7Zm9yKHZhciBpPTA7aTxudW0ubGVuZ3RoLW9mZnNldDtpKyspe3RoaXMubnVtW2ldPW51bVtpK29mZnNldF07fX1cbiAgICBRUlBvbHlub21pYWwucHJvdG90eXBlPXtnZXQ6ZnVuY3Rpb24oaW5kZXgpe3JldHVybiB0aGlzLm51bVtpbmRleF07fSxnZXRMZW5ndGg6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5udW0ubGVuZ3RoO30sbXVsdGlwbHk6ZnVuY3Rpb24oZSl7dmFyIG51bT1uZXcgQXJyYXkodGhpcy5nZXRMZW5ndGgoKStlLmdldExlbmd0aCgpLTEpO2Zvcih2YXIgaT0wO2k8dGhpcy5nZXRMZW5ndGgoKTtpKyspe2Zvcih2YXIgaj0wO2o8ZS5nZXRMZW5ndGgoKTtqKyspe251bVtpK2pdXj1RUk1hdGguZ2V4cChRUk1hdGguZ2xvZyh0aGlzLmdldChpKSkrUVJNYXRoLmdsb2coZS5nZXQoaikpKTt9fVxuICAgIHJldHVybiBuZXcgUVJQb2x5bm9taWFsKG51bSwwKTt9LG1vZDpmdW5jdGlvbihlKXtpZih0aGlzLmdldExlbmd0aCgpLWUuZ2V0TGVuZ3RoKCk8MCl7cmV0dXJuIHRoaXM7fVxuICAgIHZhciByYXRpbz1RUk1hdGguZ2xvZyh0aGlzLmdldCgwKSktUVJNYXRoLmdsb2coZS5nZXQoMCkpO3ZhciBudW09bmV3IEFycmF5KHRoaXMuZ2V0TGVuZ3RoKCkpO2Zvcih2YXIgaT0wO2k8dGhpcy5nZXRMZW5ndGgoKTtpKyspe251bVtpXT10aGlzLmdldChpKTt9XG4gICAgZm9yKHZhciBpPTA7aTxlLmdldExlbmd0aCgpO2krKyl7bnVtW2ldXj1RUk1hdGguZ2V4cChRUk1hdGguZ2xvZyhlLmdldChpKSkrcmF0aW8pO31cbiAgICByZXR1cm4gbmV3IFFSUG9seW5vbWlhbChudW0sMCkubW9kKGUpO319O2Z1bmN0aW9uIFFSUlNCbG9jayh0b3RhbENvdW50LGRhdGFDb3VudCl7dGhpcy50b3RhbENvdW50PXRvdGFsQ291bnQ7dGhpcy5kYXRhQ291bnQ9ZGF0YUNvdW50O31cbiAgICBRUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEU9W1sxLDI2LDE5XSxbMSwyNiwxNl0sWzEsMjYsMTNdLFsxLDI2LDldLFsxLDQ0LDM0XSxbMSw0NCwyOF0sWzEsNDQsMjJdLFsxLDQ0LDE2XSxbMSw3MCw1NV0sWzEsNzAsNDRdLFsyLDM1LDE3XSxbMiwzNSwxM10sWzEsMTAwLDgwXSxbMiw1MCwzMl0sWzIsNTAsMjRdLFs0LDI1LDldLFsxLDEzNCwxMDhdLFsyLDY3LDQzXSxbMiwzMywxNSwyLDM0LDE2XSxbMiwzMywxMSwyLDM0LDEyXSxbMiw4Niw2OF0sWzQsNDMsMjddLFs0LDQzLDE5XSxbNCw0MywxNV0sWzIsOTgsNzhdLFs0LDQ5LDMxXSxbMiwzMiwxNCw0LDMzLDE1XSxbNCwzOSwxMywxLDQwLDE0XSxbMiwxMjEsOTddLFsyLDYwLDM4LDIsNjEsMzldLFs0LDQwLDE4LDIsNDEsMTldLFs0LDQwLDE0LDIsNDEsMTVdLFsyLDE0NiwxMTZdLFszLDU4LDM2LDIsNTksMzddLFs0LDM2LDE2LDQsMzcsMTddLFs0LDM2LDEyLDQsMzcsMTNdLFsyLDg2LDY4LDIsODcsNjldLFs0LDY5LDQzLDEsNzAsNDRdLFs2LDQzLDE5LDIsNDQsMjBdLFs2LDQzLDE1LDIsNDQsMTZdLFs0LDEwMSw4MV0sWzEsODAsNTAsNCw4MSw1MV0sWzQsNTAsMjIsNCw1MSwyM10sWzMsMzYsMTIsOCwzNywxM10sWzIsMTE2LDkyLDIsMTE3LDkzXSxbNiw1OCwzNiwyLDU5LDM3XSxbNCw0NiwyMCw2LDQ3LDIxXSxbNyw0MiwxNCw0LDQzLDE1XSxbNCwxMzMsMTA3XSxbOCw1OSwzNywxLDYwLDM4XSxbOCw0NCwyMCw0LDQ1LDIxXSxbMTIsMzMsMTEsNCwzNCwxMl0sWzMsMTQ1LDExNSwxLDE0NiwxMTZdLFs0LDY0LDQwLDUsNjUsNDFdLFsxMSwzNiwxNiw1LDM3LDE3XSxbMTEsMzYsMTIsNSwzNywxM10sWzUsMTA5LDg3LDEsMTEwLDg4XSxbNSw2NSw0MSw1LDY2LDQyXSxbNSw1NCwyNCw3LDU1LDI1XSxbMTEsMzYsMTJdLFs1LDEyMiw5OCwxLDEyMyw5OV0sWzcsNzMsNDUsMyw3NCw0Nl0sWzE1LDQzLDE5LDIsNDQsMjBdLFszLDQ1LDE1LDEzLDQ2LDE2XSxbMSwxMzUsMTA3LDUsMTM2LDEwOF0sWzEwLDc0LDQ2LDEsNzUsNDddLFsxLDUwLDIyLDE1LDUxLDIzXSxbMiw0MiwxNCwxNyw0MywxNV0sWzUsMTUwLDEyMCwxLDE1MSwxMjFdLFs5LDY5LDQzLDQsNzAsNDRdLFsxNyw1MCwyMiwxLDUxLDIzXSxbMiw0MiwxNCwxOSw0MywxNV0sWzMsMTQxLDExMyw0LDE0MiwxMTRdLFszLDcwLDQ0LDExLDcxLDQ1XSxbMTcsNDcsMjEsNCw0OCwyMl0sWzksMzksMTMsMTYsNDAsMTRdLFszLDEzNSwxMDcsNSwxMzYsMTA4XSxbMyw2Nyw0MSwxMyw2OCw0Ml0sWzE1LDU0LDI0LDUsNTUsMjVdLFsxNSw0MywxNSwxMCw0NCwxNl0sWzQsMTQ0LDExNiw0LDE0NSwxMTddLFsxNyw2OCw0Ml0sWzE3LDUwLDIyLDYsNTEsMjNdLFsxOSw0NiwxNiw2LDQ3LDE3XSxbMiwxMzksMTExLDcsMTQwLDExMl0sWzE3LDc0LDQ2XSxbNyw1NCwyNCwxNiw1NSwyNV0sWzM0LDM3LDEzXSxbNCwxNTEsMTIxLDUsMTUyLDEyMl0sWzQsNzUsNDcsMTQsNzYsNDhdLFsxMSw1NCwyNCwxNCw1NSwyNV0sWzE2LDQ1LDE1LDE0LDQ2LDE2XSxbNiwxNDcsMTE3LDQsMTQ4LDExOF0sWzYsNzMsNDUsMTQsNzQsNDZdLFsxMSw1NCwyNCwxNiw1NSwyNV0sWzMwLDQ2LDE2LDIsNDcsMTddLFs4LDEzMiwxMDYsNCwxMzMsMTA3XSxbOCw3NSw0NywxMyw3Niw0OF0sWzcsNTQsMjQsMjIsNTUsMjVdLFsyMiw0NSwxNSwxMyw0NiwxNl0sWzEwLDE0MiwxMTQsMiwxNDMsMTE1XSxbMTksNzQsNDYsNCw3NSw0N10sWzI4LDUwLDIyLDYsNTEsMjNdLFszMyw0NiwxNiw0LDQ3LDE3XSxbOCwxNTIsMTIyLDQsMTUzLDEyM10sWzIyLDczLDQ1LDMsNzQsNDZdLFs4LDUzLDIzLDI2LDU0LDI0XSxbMTIsNDUsMTUsMjgsNDYsMTZdLFszLDE0NywxMTcsMTAsMTQ4LDExOF0sWzMsNzMsNDUsMjMsNzQsNDZdLFs0LDU0LDI0LDMxLDU1LDI1XSxbMTEsNDUsMTUsMzEsNDYsMTZdLFs3LDE0NiwxMTYsNywxNDcsMTE3XSxbMjEsNzMsNDUsNyw3NCw0Nl0sWzEsNTMsMjMsMzcsNTQsMjRdLFsxOSw0NSwxNSwyNiw0NiwxNl0sWzUsMTQ1LDExNSwxMCwxNDYsMTE2XSxbMTksNzUsNDcsMTAsNzYsNDhdLFsxNSw1NCwyNCwyNSw1NSwyNV0sWzIzLDQ1LDE1LDI1LDQ2LDE2XSxbMTMsMTQ1LDExNSwzLDE0NiwxMTZdLFsyLDc0LDQ2LDI5LDc1LDQ3XSxbNDIsNTQsMjQsMSw1NSwyNV0sWzIzLDQ1LDE1LDI4LDQ2LDE2XSxbMTcsMTQ1LDExNV0sWzEwLDc0LDQ2LDIzLDc1LDQ3XSxbMTAsNTQsMjQsMzUsNTUsMjVdLFsxOSw0NSwxNSwzNSw0NiwxNl0sWzE3LDE0NSwxMTUsMSwxNDYsMTE2XSxbMTQsNzQsNDYsMjEsNzUsNDddLFsyOSw1NCwyNCwxOSw1NSwyNV0sWzExLDQ1LDE1LDQ2LDQ2LDE2XSxbMTMsMTQ1LDExNSw2LDE0NiwxMTZdLFsxNCw3NCw0NiwyMyw3NSw0N10sWzQ0LDU0LDI0LDcsNTUsMjVdLFs1OSw0NiwxNiwxLDQ3LDE3XSxbMTIsMTUxLDEyMSw3LDE1MiwxMjJdLFsxMiw3NSw0NywyNiw3Niw0OF0sWzM5LDU0LDI0LDE0LDU1LDI1XSxbMjIsNDUsMTUsNDEsNDYsMTZdLFs2LDE1MSwxMjEsMTQsMTUyLDEyMl0sWzYsNzUsNDcsMzQsNzYsNDhdLFs0Niw1NCwyNCwxMCw1NSwyNV0sWzIsNDUsMTUsNjQsNDYsMTZdLFsxNywxNTIsMTIyLDQsMTUzLDEyM10sWzI5LDc0LDQ2LDE0LDc1LDQ3XSxbNDksNTQsMjQsMTAsNTUsMjVdLFsyNCw0NSwxNSw0Niw0NiwxNl0sWzQsMTUyLDEyMiwxOCwxNTMsMTIzXSxbMTMsNzQsNDYsMzIsNzUsNDddLFs0OCw1NCwyNCwxNCw1NSwyNV0sWzQyLDQ1LDE1LDMyLDQ2LDE2XSxbMjAsMTQ3LDExNyw0LDE0OCwxMThdLFs0MCw3NSw0Nyw3LDc2LDQ4XSxbNDMsNTQsMjQsMjIsNTUsMjVdLFsxMCw0NSwxNSw2Nyw0NiwxNl0sWzE5LDE0OCwxMTgsNiwxNDksMTE5XSxbMTgsNzUsNDcsMzEsNzYsNDhdLFszNCw1NCwyNCwzNCw1NSwyNV0sWzIwLDQ1LDE1LDYxLDQ2LDE2XV07UVJSU0Jsb2NrLmdldFJTQmxvY2tzPWZ1bmN0aW9uKHR5cGVOdW1iZXIsZXJyb3JDb3JyZWN0TGV2ZWwpe3ZhciByc0Jsb2NrPVFSUlNCbG9jay5nZXRSc0Jsb2NrVGFibGUodHlwZU51bWJlcixlcnJvckNvcnJlY3RMZXZlbCk7aWYocnNCbG9jaz09dW5kZWZpbmVkKXt0aHJvdyBuZXcgRXJyb3IoXCJiYWQgcnMgYmxvY2sgQCB0eXBlTnVtYmVyOlwiK3R5cGVOdW1iZXIrXCIvZXJyb3JDb3JyZWN0TGV2ZWw6XCIrZXJyb3JDb3JyZWN0TGV2ZWwpO31cbiAgICB2YXIgbGVuZ3RoPXJzQmxvY2subGVuZ3RoLzM7dmFyIGxpc3Q9W107Zm9yKHZhciBpPTA7aTxsZW5ndGg7aSsrKXt2YXIgY291bnQ9cnNCbG9ja1tpKjMrMF07dmFyIHRvdGFsQ291bnQ9cnNCbG9ja1tpKjMrMV07dmFyIGRhdGFDb3VudD1yc0Jsb2NrW2kqMysyXTtmb3IodmFyIGo9MDtqPGNvdW50O2orKyl7bGlzdC5wdXNoKG5ldyBRUlJTQmxvY2sodG90YWxDb3VudCxkYXRhQ291bnQpKTt9fVxuICAgIHJldHVybiBsaXN0O307UVJSU0Jsb2NrLmdldFJzQmxvY2tUYWJsZT1mdW5jdGlvbih0eXBlTnVtYmVyLGVycm9yQ29ycmVjdExldmVsKXtzd2l0Y2goZXJyb3JDb3JyZWN0TGV2ZWwpe2Nhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5MOnJldHVybiBRUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEVbKHR5cGVOdW1iZXItMSkqNCswXTtjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuTTpyZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyLTEpKjQrMV07Y2FzZSBRUkVycm9yQ29ycmVjdExldmVsLlE6cmV0dXJuIFFSUlNCbG9jay5SU19CTE9DS19UQUJMRVsodHlwZU51bWJlci0xKSo0KzJdO2Nhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5IOnJldHVybiBRUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEVbKHR5cGVOdW1iZXItMSkqNCszXTtkZWZhdWx0OnJldHVybiB1bmRlZmluZWQ7fX07ZnVuY3Rpb24gUVJCaXRCdWZmZXIoKXt0aGlzLmJ1ZmZlcj1bXTt0aGlzLmxlbmd0aD0wO31cbiAgICBRUkJpdEJ1ZmZlci5wcm90b3R5cGU9e2dldDpmdW5jdGlvbihpbmRleCl7dmFyIGJ1ZkluZGV4PU1hdGguZmxvb3IoaW5kZXgvOCk7cmV0dXJuKCh0aGlzLmJ1ZmZlcltidWZJbmRleF0+Pj4oNy1pbmRleCU4KSkmMSk9PTE7fSxwdXQ6ZnVuY3Rpb24obnVtLGxlbmd0aCl7Zm9yKHZhciBpPTA7aTxsZW5ndGg7aSsrKXt0aGlzLnB1dEJpdCgoKG51bT4+PihsZW5ndGgtaS0xKSkmMSk9PTEpO319LGdldExlbmd0aEluQml0czpmdW5jdGlvbigpe3JldHVybiB0aGlzLmxlbmd0aDt9LHB1dEJpdDpmdW5jdGlvbihiaXQpe3ZhciBidWZJbmRleD1NYXRoLmZsb29yKHRoaXMubGVuZ3RoLzgpO2lmKHRoaXMuYnVmZmVyLmxlbmd0aDw9YnVmSW5kZXgpe3RoaXMuYnVmZmVyLnB1c2goMCk7fVxuICAgIGlmKGJpdCl7dGhpcy5idWZmZXJbYnVmSW5kZXhdfD0oMHg4MD4+Pih0aGlzLmxlbmd0aCU4KSk7fVxuICAgIHRoaXMubGVuZ3RoKys7fX07dmFyIFFSQ29kZUxpbWl0TGVuZ3RoPVtbMTcsMTQsMTEsN10sWzMyLDI2LDIwLDE0XSxbNTMsNDIsMzIsMjRdLFs3OCw2Miw0NiwzNF0sWzEwNiw4NCw2MCw0NF0sWzEzNCwxMDYsNzQsNThdLFsxNTQsMTIyLDg2LDY0XSxbMTkyLDE1MiwxMDgsODRdLFsyMzAsMTgwLDEzMCw5OF0sWzI3MSwyMTMsMTUxLDExOV0sWzMyMSwyNTEsMTc3LDEzN10sWzM2NywyODcsMjAzLDE1NV0sWzQyNSwzMzEsMjQxLDE3N10sWzQ1OCwzNjIsMjU4LDE5NF0sWzUyMCw0MTIsMjkyLDIyMF0sWzU4Niw0NTAsMzIyLDI1MF0sWzY0NCw1MDQsMzY0LDI4MF0sWzcxOCw1NjAsMzk0LDMxMF0sWzc5Miw2MjQsNDQyLDMzOF0sWzg1OCw2NjYsNDgyLDM4Ml0sWzkyOSw3MTEsNTA5LDQwM10sWzEwMDMsNzc5LDU2NSw0MzldLFsxMDkxLDg1Nyw2MTEsNDYxXSxbMTE3MSw5MTEsNjYxLDUxMV0sWzEyNzMsOTk3LDcxNSw1MzVdLFsxMzY3LDEwNTksNzUxLDU5M10sWzE0NjUsMTEyNSw4MDUsNjI1XSxbMTUyOCwxMTkwLDg2OCw2NThdLFsxNjI4LDEyNjQsOTA4LDY5OF0sWzE3MzIsMTM3MCw5ODIsNzQyXSxbMTg0MCwxNDUyLDEwMzAsNzkwXSxbMTk1MiwxNTM4LDExMTIsODQyXSxbMjA2OCwxNjI4LDExNjgsODk4XSxbMjE4OCwxNzIyLDEyMjgsOTU4XSxbMjMwMywxODA5LDEyODMsOTgzXSxbMjQzMSwxOTExLDEzNTEsMTA1MV0sWzI1NjMsMTk4OSwxNDIzLDEwOTNdLFsyNjk5LDIwOTksMTQ5OSwxMTM5XSxbMjgwOSwyMjEzLDE1NzksMTIxOV0sWzI5NTMsMjMzMSwxNjYzLDEyNzNdXTtcblxuICAgIGZ1bmN0aW9uIF9pc1N1cHBvcnRDYW52YXMoKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEICE9IFwidW5kZWZpbmVkXCI7XG4gICAgfVxuXG4gICAgLy8gYW5kcm9pZCAyLnggZG9lc24ndCBzdXBwb3J0IERhdGEtVVJJIHNwZWNcbiAgICBmdW5jdGlvbiBfZ2V0QW5kcm9pZCgpIHtcbiAgICAgICAgdmFyIGFuZHJvaWQgPSBmYWxzZTtcbiAgICAgICAgdmFyIHNBZ2VudCA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG5cbiAgICAgICAgaWYgKC9hbmRyb2lkL2kudGVzdChzQWdlbnQpKSB7IC8vIGFuZHJvaWRcbiAgICAgICAgICAgIGFuZHJvaWQgPSB0cnVlO1xuICAgICAgICAgICAgYU1hdCA9IHNBZ2VudC50b1N0cmluZygpLm1hdGNoKC9hbmRyb2lkIChbMC05XVxcLlswLTldKS9pKTtcblxuICAgICAgICAgICAgaWYgKGFNYXQgJiYgYU1hdFsxXSkge1xuICAgICAgICAgICAgICAgIGFuZHJvaWQgPSBwYXJzZUZsb2F0KGFNYXRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFuZHJvaWQ7XG4gICAgfVxuXG4gICAgdmFyIHN2Z0RyYXdlciA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgRHJhd2luZyA9IGZ1bmN0aW9uIChlbCwgaHRPcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuX2VsID0gZWw7XG4gICAgICAgICAgICB0aGlzLl9odE9wdGlvbiA9IGh0T3B0aW9uO1xuICAgICAgICB9O1xuXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiAob1FSQ29kZSkge1xuICAgICAgICAgICAgdmFyIF9odE9wdGlvbiA9IHRoaXMuX2h0T3B0aW9uO1xuICAgICAgICAgICAgdmFyIF9lbCA9IHRoaXMuX2VsO1xuICAgICAgICAgICAgdmFyIG5Db3VudCA9IG9RUkNvZGUuZ2V0TW9kdWxlQ291bnQoKTtcbiAgICAgICAgICAgIHZhciBuV2lkdGggPSBNYXRoLmZsb29yKF9odE9wdGlvbi53aWR0aCAvIG5Db3VudCk7XG4gICAgICAgICAgICB2YXIgbkhlaWdodCA9IE1hdGguZmxvb3IoX2h0T3B0aW9uLmhlaWdodCAvIG5Db3VudCk7XG5cbiAgICAgICAgICAgIHRoaXMuY2xlYXIoKTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gbWFrZVNWRyh0YWcsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsIHRhZyk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayBpbiBhdHRycylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLmhhc093blByb3BlcnR5KGspKSBlbC5zZXRBdHRyaWJ1dGUoaywgYXR0cnNba10pO1xuICAgICAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN2ZyA9IG1ha2VTVkcoXCJzdmdcIiAsIHsndmlld0JveCc6ICcwIDAgJyArIFN0cmluZyhuQ291bnQpICsgXCIgXCIgKyBTdHJpbmcobkNvdW50KSwgJ3dpZHRoJzogJzEwMCUnLCAnaGVpZ2h0JzogJzEwMCUnLCAnZmlsbCc6IF9odE9wdGlvbi5jb2xvckxpZ2h0fSk7XG4gICAgICAgICAgICBzdmcuc2V0QXR0cmlidXRlTlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3htbG5zL1wiLCBcInhtbG5zOnhsaW5rXCIsIFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiKTtcbiAgICAgICAgICAgIF9lbC5hcHBlbmRDaGlsZChzdmcpO1xuXG4gICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQobWFrZVNWRyhcInJlY3RcIiwge1wiZmlsbFwiOiBfaHRPcHRpb24uY29sb3JEYXJrLCBcIndpZHRoXCI6IFwiMVwiLCBcImhlaWdodFwiOiBcIjFcIiwgXCJpZFwiOiBcInRlbXBsYXRlXCJ9KSk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IG5Db3VudDsgcm93KyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBuQ291bnQ7IGNvbCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvUVJDb2RlLmlzRGFyayhyb3csIGNvbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IG1ha2VTVkcoXCJ1c2VcIiwge1wieFwiOiBTdHJpbmcocm93KSwgXCJ5XCI6IFN0cmluZyhjb2wpfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5zZXRBdHRyaWJ1dGVOUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiwgXCJocmVmXCIsIFwiI3RlbXBsYXRlXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBzdmcuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLl9lbC5oYXNDaGlsZE5vZGVzKCkpXG4gICAgICAgICAgICAgICAgdGhpcy5fZWwucmVtb3ZlQ2hpbGQodGhpcy5fZWwubGFzdENoaWxkKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIERyYXdpbmc7XG4gICAgfSkoKTtcblxuICAgIC8vIEhhZCB0byBjaGFuZ2UgdGhpcyBhIGJpdCwgYmVjYXVzZSBvZiBicm93c2VyaWZ5LlxuICAgIC8vIGRvY3VtZW50IHByb3BlcnRpZXMgY2Fubm90IGJlIHRlc3RlZCB3aGVuIHRoZSBKUyBpcyBsb2FkZWQsXG4gICAgLy8gYWxsIHdpbmRvdy9kb2N1bWVudCBhY2Nlc3Mgc2hvdWxkIGJlIGRvbmUgaW4gdGhlIGV2ZW50IGhhbmRsZXJzIG9ubHkuXG4gICAgdmFyIHVzZVNWRztcbiAgICBpZihnbG9iYWwpIHtcbiAgICAgICAgLy8gdGFwZSArIFB1cmUgTm9kZUpTXG4gICAgICAgIHVzZVNWRyA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHVzZVNWRyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwic3ZnXCI7XG4gICAgfVxuXG4gICAgLy8gRHJhd2luZyBpbiBET00gYnkgdXNpbmcgVGFibGUgdGFnXG4gICAgdmFyIERyYXdpbmcgPSB1c2VTVkcgPyBzdmdEcmF3ZXIgOiAhX2lzU3VwcG9ydENhbnZhcygpID8gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIERyYXdpbmcgPSBmdW5jdGlvbiAoZWwsIGh0T3B0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLl9lbCA9IGVsO1xuICAgICAgICAgICAgdGhpcy5faHRPcHRpb24gPSBodE9wdGlvbjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRHJhdyB0aGUgUVJDb2RlXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7UVJDb2RlfSBvUVJDb2RlXG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gKG9RUkNvZGUpIHtcbiAgICAgICAgICAgIHZhciBfaHRPcHRpb24gPSB0aGlzLl9odE9wdGlvbjtcbiAgICAgICAgICAgIHZhciBfZWwgPSB0aGlzLl9lbDtcbiAgICAgICAgICAgIHZhciBuQ291bnQgPSBvUVJDb2RlLmdldE1vZHVsZUNvdW50KCk7XG4gICAgICAgICAgICB2YXIgbldpZHRoID0gTWF0aC5mbG9vcihfaHRPcHRpb24ud2lkdGggLyBuQ291bnQpO1xuICAgICAgICAgICAgdmFyIG5IZWlnaHQgPSBNYXRoLmZsb29yKF9odE9wdGlvbi5oZWlnaHQgLyBuQ291bnQpO1xuICAgICAgICAgICAgdmFyIGFIVE1MID0gWyc8dGFibGUgc3R5bGU9XCJib3JkZXI6MDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7XCI+J107XG5cbiAgICAgICAgICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IG5Db3VudDsgcm93KyspIHtcbiAgICAgICAgICAgICAgICBhSFRNTC5wdXNoKCc8dHI+Jyk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBuQ291bnQ7IGNvbCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFIVE1MLnB1c2goJzx0ZCBzdHlsZT1cImJvcmRlcjowO2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtwYWRkaW5nOjA7bWFyZ2luOjA7d2lkdGg6JyArIG5XaWR0aCArICdweDtoZWlnaHQ6JyArIG5IZWlnaHQgKyAncHg7YmFja2dyb3VuZC1jb2xvcjonICsgKG9RUkNvZGUuaXNEYXJrKHJvdywgY29sKSA/IF9odE9wdGlvbi5jb2xvckRhcmsgOiBfaHRPcHRpb24uY29sb3JMaWdodCkgKyAnO1wiPjwvdGQ+Jyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYUhUTUwucHVzaCgnPC90cj4nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYUhUTUwucHVzaCgnPC90YWJsZT4nKTtcbiAgICAgICAgICAgIF9lbC5pbm5lckhUTUwgPSBhSFRNTC5qb2luKCcnKTtcblxuICAgICAgICAgICAgLy8gRml4IHRoZSBtYXJnaW4gdmFsdWVzIGFzIHJlYWwgc2l6ZS5cbiAgICAgICAgICAgIHZhciBlbFRhYmxlID0gX2VsLmNoaWxkTm9kZXNbMF07XG4gICAgICAgICAgICB2YXIgbkxlZnRNYXJnaW5UYWJsZSA9IChfaHRPcHRpb24ud2lkdGggLSBlbFRhYmxlLm9mZnNldFdpZHRoKSAvIDI7XG4gICAgICAgICAgICB2YXIgblRvcE1hcmdpblRhYmxlID0gKF9odE9wdGlvbi5oZWlnaHQgLSBlbFRhYmxlLm9mZnNldEhlaWdodCkgLyAyO1xuXG4gICAgICAgICAgICBpZiAobkxlZnRNYXJnaW5UYWJsZSA+IDAgJiYgblRvcE1hcmdpblRhYmxlID4gMCkge1xuICAgICAgICAgICAgICAgIGVsVGFibGUuc3R5bGUubWFyZ2luID0gblRvcE1hcmdpblRhYmxlICsgXCJweCBcIiArIG5MZWZ0TWFyZ2luVGFibGUgKyBcInB4XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENsZWFyIHRoZSBRUkNvZGVcbiAgICAgICAgICovXG4gICAgICAgIERyYXdpbmcucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fZWwuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIERyYXdpbmc7XG4gICAgfSkoKSA6IChmdW5jdGlvbiAoKSB7IC8vIERyYXdpbmcgaW4gQ2FudmFzXG4gICAgICAgIGZ1bmN0aW9uIF9vbk1ha2VJbWFnZSgpIHtcbiAgICAgICAgICAgIHRoaXMuX2VsSW1hZ2Uuc3JjID0gdGhpcy5fZWxDYW52YXMudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpO1xuICAgICAgICAgICAgdGhpcy5fZWxJbWFnZS5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuICAgICAgICAgICAgdGhpcy5fZWxDYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQW5kcm9pZCAyLjEgYnVnIHdvcmthcm91bmRcbiAgICAgICAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2FuZHJvaWQvaXNzdWVzL2RldGFpbD9pZD01MTQxXG4gICAgICAgIGlmICh0aGlzLl9hbmRyb2lkICYmIHRoaXMuX2FuZHJvaWQgPD0gMi4xKSB7XG4gICAgICAgICAgICB2YXIgZmFjdG9yID0gMSAvIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgICAgICAgdmFyIGRyYXdJbWFnZSA9IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRC5wcm90b3R5cGUuZHJhd0ltYWdlO1xuICAgICAgICAgICAgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELnByb3RvdHlwZS5kcmF3SW1hZ2UgPSBmdW5jdGlvbiAoaW1hZ2UsIHN4LCBzeSwgc3csIHNoLCBkeCwgZHksIGR3LCBkaCkge1xuICAgICAgICAgICAgICAgIGlmICgoXCJub2RlTmFtZVwiIGluIGltYWdlKSAmJiAvaW1nL2kudGVzdChpbWFnZS5ub2RlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IDE7IGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzW2ldID0gYXJndW1lbnRzW2ldICogZmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZHcgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbMV0gKj0gZmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbMl0gKj0gZmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbM10gKj0gZmFjdG9yO1xuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHNbNF0gKj0gZmFjdG9yO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRyYXdJbWFnZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayB3aGV0aGVyIHRoZSB1c2VyJ3MgYnJvd3NlciBzdXBwb3J0cyBEYXRhIFVSSSBvciBub3RcbiAgICAgICAgICpcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gZlN1Y2Nlc3MgT2NjdXJzIGlmIGl0IHN1cHBvcnRzIERhdGEgVVJJXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZGYWlsIE9jY3VycyBpZiBpdCBkb2Vzbid0IHN1cHBvcnQgRGF0YSBVUklcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIF9zYWZlU2V0RGF0YVVSSShmU3VjY2VzcywgZkZhaWwpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHNlbGYuX2ZGYWlsID0gZkZhaWw7XG4gICAgICAgICAgICBzZWxmLl9mU3VjY2VzcyA9IGZTdWNjZXNzO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpdCBqdXN0IG9uY2VcbiAgICAgICAgICAgIGlmIChzZWxmLl9iU3VwcG9ydERhdGFVUkkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xuICAgICAgICAgICAgICAgIHZhciBmT25FcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9iU3VwcG9ydERhdGFVUkkgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5fZkZhaWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9mRmFpbC5jYWxsKHNlbGYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgZk9uU3VjY2VzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9iU3VwcG9ydERhdGFVUkkgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9mU3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fZlN1Y2Nlc3MuY2FsbChzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBlbC5vbmFib3J0ID0gZk9uRXJyb3I7XG4gICAgICAgICAgICAgICAgZWwub25lcnJvciA9IGZPbkVycm9yO1xuICAgICAgICAgICAgICAgIGVsLm9ubG9hZCA9IGZPblN1Y2Nlc3M7XG4gICAgICAgICAgICAgICAgZWwuc3JjID0gXCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFVQUFBQUZDQVlBQUFDTmJ5YmxBQUFBSEVsRVFWUUkxMlA0Ly84L3czOEdJQVhESUJLRTBESHhnbGpOQkFBTzlUWEwwWTRPSHdBQUFBQkpSVTVFcmtKZ2dnPT1cIjsgLy8gdGhlIEltYWdlIGNvbnRhaW5zIDFweCBkYXRhLlxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZi5fYlN1cHBvcnREYXRhVVJJID09PSB0cnVlICYmIHNlbGYuX2ZTdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fZlN1Y2Nlc3MuY2FsbChzZWxmKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2VsZi5fYlN1cHBvcnREYXRhVVJJID09PSBmYWxzZSAmJiBzZWxmLl9mRmFpbCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2ZGYWlsLmNhbGwoc2VsZik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERyYXdpbmcgUVJDb2RlIGJ5IHVzaW5nIGNhbnZhc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGh0T3B0aW9uIFFSQ29kZSBPcHRpb25zXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgRHJhd2luZyA9IGZ1bmN0aW9uIChlbCwgaHRPcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuX2JJc1BhaW50ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2FuZHJvaWQgPSBfZ2V0QW5kcm9pZCgpO1xuXG4gICAgICAgICAgICB0aGlzLl9odE9wdGlvbiA9IGh0T3B0aW9uO1xuICAgICAgICAgICAgdGhpcy5fZWxDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgICAgICAgICAgdGhpcy5fZWxDYW52YXMud2lkdGggPSBodE9wdGlvbi53aWR0aDtcbiAgICAgICAgICAgIHRoaXMuX2VsQ2FudmFzLmhlaWdodCA9IGh0T3B0aW9uLmhlaWdodDtcbiAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKHRoaXMuX2VsQ2FudmFzKTtcbiAgICAgICAgICAgIHRoaXMuX2VsID0gZWw7XG4gICAgICAgICAgICB0aGlzLl9vQ29udGV4dCA9IHRoaXMuX2VsQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgICAgICAgIHRoaXMuX2JJc1BhaW50ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuX2VsSW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xuICAgICAgICAgICAgdGhpcy5fZWxJbWFnZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICB0aGlzLl9lbC5hcHBlbmRDaGlsZCh0aGlzLl9lbEltYWdlKTtcbiAgICAgICAgICAgIHRoaXMuX2JTdXBwb3J0RGF0YVVSSSA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERyYXcgdGhlIFFSQ29kZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1FSQ29kZX0gb1FSQ29kZVxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIChvUVJDb2RlKSB7XG4gICAgICAgICAgICB2YXIgX2VsSW1hZ2UgPSB0aGlzLl9lbEltYWdlO1xuICAgICAgICAgICAgdmFyIF9vQ29udGV4dCA9IHRoaXMuX29Db250ZXh0O1xuICAgICAgICAgICAgdmFyIF9odE9wdGlvbiA9IHRoaXMuX2h0T3B0aW9uO1xuXG4gICAgICAgICAgICB2YXIgbkNvdW50ID0gb1FSQ29kZS5nZXRNb2R1bGVDb3VudCgpO1xuICAgICAgICAgICAgdmFyIG5XaWR0aCA9IF9odE9wdGlvbi53aWR0aCAvIG5Db3VudDtcbiAgICAgICAgICAgIHZhciBuSGVpZ2h0ID0gX2h0T3B0aW9uLmhlaWdodCAvIG5Db3VudDtcbiAgICAgICAgICAgIHZhciBuUm91bmRlZFdpZHRoID0gTWF0aC5yb3VuZChuV2lkdGgpO1xuICAgICAgICAgICAgdmFyIG5Sb3VuZGVkSGVpZ2h0ID0gTWF0aC5yb3VuZChuSGVpZ2h0KTtcblxuICAgICAgICAgICAgX2VsSW1hZ2Uuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBuQ291bnQ7IHJvdysrKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgbkNvdW50OyBjb2wrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYklzRGFyayA9IG9RUkNvZGUuaXNEYXJrKHJvdywgY29sKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5MZWZ0ID0gY29sICogbldpZHRoO1xuICAgICAgICAgICAgICAgICAgICB2YXIgblRvcCA9IHJvdyAqIG5IZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIF9vQ29udGV4dC5zdHJva2VTdHlsZSA9IGJJc0RhcmsgPyBfaHRPcHRpb24uY29sb3JEYXJrIDogX2h0T3B0aW9uLmNvbG9yTGlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIF9vQ29udGV4dC5saW5lV2lkdGggPSAxO1xuICAgICAgICAgICAgICAgICAgICBfb0NvbnRleHQuZmlsbFN0eWxlID0gYklzRGFyayA/IF9odE9wdGlvbi5jb2xvckRhcmsgOiBfaHRPcHRpb24uY29sb3JMaWdodDtcbiAgICAgICAgICAgICAgICAgICAgX29Db250ZXh0LmZpbGxSZWN0KG5MZWZ0LCBuVG9wLCBuV2lkdGgsIG5IZWlnaHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIOyViO2LsCDslajrpqzslrTsi7Eg67Cp7KeAIOyymOumrFxuICAgICAgICAgICAgICAgICAgICBfb0NvbnRleHQuc3Ryb2tlUmVjdChcbiAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IobkxlZnQpICsgMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcihuVG9wKSArIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Sb3VuZGVkV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBuUm91bmRlZEhlaWdodFxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIF9vQ29udGV4dC5zdHJva2VSZWN0KFxuICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5jZWlsKG5MZWZ0KSAtIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguY2VpbChuVG9wKSAtIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Sb3VuZGVkV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBuUm91bmRlZEhlaWdodFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5fYklzUGFpbnRlZCA9IHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1ha2UgdGhlIGltYWdlIGZyb20gQ2FudmFzIGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIERhdGEgVVJJLlxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUubWFrZUltYWdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2JJc1BhaW50ZWQpIHtcbiAgICAgICAgICAgICAgICBfc2FmZVNldERhdGFVUkkuY2FsbCh0aGlzLCBfb25NYWtlSW1hZ2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm4gd2hldGhlciB0aGUgUVJDb2RlIGlzIHBhaW50ZWQgb3Igbm90XG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5pc1BhaW50ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYklzUGFpbnRlZDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2xlYXIgdGhlIFFSQ29kZVxuICAgICAgICAgKi9cbiAgICAgICAgRHJhd2luZy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9vQ29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5fZWxDYW52YXMud2lkdGgsIHRoaXMuX2VsQ2FudmFzLmhlaWdodCk7XG4gICAgICAgICAgICB0aGlzLl9iSXNQYWludGVkID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBuTnVtYmVyXG4gICAgICAgICAqL1xuICAgICAgICBEcmF3aW5nLnByb3RvdHlwZS5yb3VuZCA9IGZ1bmN0aW9uIChuTnVtYmVyKSB7XG4gICAgICAgICAgICBpZiAoIW5OdW1iZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbk51bWJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3Iobk51bWJlciAqIDEwMDApIC8gMTAwMDtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gRHJhd2luZztcbiAgICB9KSgpO1xuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSB0eXBlIGJ5IHN0cmluZyBsZW5ndGhcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHNUZXh0XG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG5Db3JyZWN0TGV2ZWxcbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IHR5cGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZ2V0VHlwZU51bWJlcihzVGV4dCwgbkNvcnJlY3RMZXZlbCkge1xuICAgICAgICB2YXIgblR5cGUgPSAxO1xuICAgICAgICB2YXIgbGVuZ3RoID0gX2dldFVURjhMZW5ndGgoc1RleHQpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBRUkNvZGVMaW1pdExlbmd0aC5sZW5ndGg7IGkgPD0gbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBuTGltaXQgPSAwO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG5Db3JyZWN0TGV2ZWwpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuTCA6XG4gICAgICAgICAgICAgICAgICAgIG5MaW1pdCA9IFFSQ29kZUxpbWl0TGVuZ3RoW2ldWzBdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuTSA6XG4gICAgICAgICAgICAgICAgICAgIG5MaW1pdCA9IFFSQ29kZUxpbWl0TGVuZ3RoW2ldWzFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuUSA6XG4gICAgICAgICAgICAgICAgICAgIG5MaW1pdCA9IFFSQ29kZUxpbWl0TGVuZ3RoW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFFSRXJyb3JDb3JyZWN0TGV2ZWwuSCA6XG4gICAgICAgICAgICAgICAgICAgIG5MaW1pdCA9IFFSQ29kZUxpbWl0TGVuZ3RoW2ldWzNdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGxlbmd0aCA8PSBuTGltaXQpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgblR5cGUrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuVHlwZSA+IFFSQ29kZUxpbWl0TGVuZ3RoLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIGxvbmcgZGF0YVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuVHlwZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZ2V0VVRGOExlbmd0aChzVGV4dCkge1xuICAgICAgICB2YXIgcmVwbGFjZWRUZXh0ID0gZW5jb2RlVVJJKHNUZXh0KS50b1N0cmluZygpLnJlcGxhY2UoL1xcJVswLTlhLWZBLUZdezJ9L2csICdhJyk7XG4gICAgICAgIHJldHVybiByZXBsYWNlZFRleHQubGVuZ3RoICsgKHJlcGxhY2VkVGV4dC5sZW5ndGggIT0gc1RleHQgPyAzIDogMCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGNsYXNzIFFSQ29kZVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBleGFtcGxlXG4gICAgICogbmV3IFFSQ29kZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRlc3RcIiksIFwiaHR0cDovL2ppbmRvLmRldi5uYXZlci5jb20vY29sbGllXCIpO1xuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiB2YXIgb1FSQ29kZSA9IG5ldyBRUkNvZGUoXCJ0ZXN0XCIsIHtcbiAgICAgKiAgICB0ZXh0IDogXCJodHRwOi8vbmF2ZXIuY29tXCIsXG4gICAgICogICAgd2lkdGggOiAxMjgsXG4gICAgICogICAgaGVpZ2h0IDogMTI4XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiBvUVJDb2RlLmNsZWFyKCk7IC8vIENsZWFyIHRoZSBRUkNvZGUuXG4gICAgICogb1FSQ29kZS5tYWtlQ29kZShcImh0dHA6Ly9tYXAubmF2ZXIuY29tXCIpOyAvLyBSZS1jcmVhdGUgdGhlIFFSQ29kZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8U3RyaW5nfSBlbCB0YXJnZXQgZWxlbWVudCBvciAnaWQnIGF0dHJpYnV0ZSBvZiBlbGVtZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdk9wdGlvblxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB2T3B0aW9uLnRleHQgUVJDb2RlIGxpbmsgZGF0YVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbdk9wdGlvbi53aWR0aD0yNTZdXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFt2T3B0aW9uLmhlaWdodD0yNTZdXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFt2T3B0aW9uLmNvbG9yRGFyaz1cIiMwMDAwMDBcIl1cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW3ZPcHRpb24uY29sb3JMaWdodD1cIiNmZmZmZmZcIl1cbiAgICAgKiBAcGFyYW0ge1FSQ29kZS5Db3JyZWN0TGV2ZWx9IFt2T3B0aW9uLmNvcnJlY3RMZXZlbD1RUkNvZGUuQ29ycmVjdExldmVsLkhdIFtMfE18UXxIXVxuICAgICAqL1xuICAgIFFSQ29kZSA9IGZ1bmN0aW9uIChlbCwgdk9wdGlvbikge1xuICAgICAgICB0aGlzLl9odE9wdGlvbiA9IHtcbiAgICAgICAgICAgIHdpZHRoIDogMjU2LFxuICAgICAgICAgICAgaGVpZ2h0IDogMjU2LFxuICAgICAgICAgICAgdHlwZU51bWJlciA6IDQsXG4gICAgICAgICAgICBjb2xvckRhcmsgOiBcIiMwMDAwMDBcIixcbiAgICAgICAgICAgIGNvbG9yTGlnaHQgOiBcIiNmZmZmZmZcIixcbiAgICAgICAgICAgIGNvcnJlY3RMZXZlbCA6IFFSRXJyb3JDb3JyZWN0TGV2ZWwuSFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2Ygdk9wdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHZPcHRpb24gPSB7XG4gICAgICAgICAgICAgICAgdGV4dCA6IHZPcHRpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdmVyd3JpdGVzIG9wdGlvbnNcbiAgICAgICAgaWYgKHZPcHRpb24pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgaW4gdk9wdGlvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuX2h0T3B0aW9uW2ldID0gdk9wdGlvbltpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZWwgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9hbmRyb2lkID0gX2dldEFuZHJvaWQoKTtcbiAgICAgICAgdGhpcy5fZWwgPSBlbDtcbiAgICAgICAgdGhpcy5fb1FSQ29kZSA9IG51bGw7XG4gICAgICAgIHRoaXMuX29EcmF3aW5nID0gbmV3IERyYXdpbmcodGhpcy5fZWwsIHRoaXMuX2h0T3B0aW9uKTtcblxuICAgICAgICBpZiAodGhpcy5faHRPcHRpb24udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5tYWtlQ29kZSh0aGlzLl9odE9wdGlvbi50ZXh0KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNYWtlIHRoZSBRUkNvZGVcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzVGV4dCBsaW5rIGRhdGFcbiAgICAgKi9cbiAgICBRUkNvZGUucHJvdG90eXBlLm1ha2VDb2RlID0gZnVuY3Rpb24gKHNUZXh0KSB7XG4gICAgICAgIHRoaXMuX29RUkNvZGUgPSBuZXcgUVJDb2RlTW9kZWwoX2dldFR5cGVOdW1iZXIoc1RleHQsIHRoaXMuX2h0T3B0aW9uLmNvcnJlY3RMZXZlbCksIHRoaXMuX2h0T3B0aW9uLmNvcnJlY3RMZXZlbCk7XG4gICAgICAgIHRoaXMuX29RUkNvZGUuYWRkRGF0YShzVGV4dCk7XG4gICAgICAgIHRoaXMuX29RUkNvZGUubWFrZSgpO1xuICAgICAgICB0aGlzLl9lbC50aXRsZSA9IHNUZXh0O1xuICAgICAgICB0aGlzLl9vRHJhd2luZy5kcmF3KHRoaXMuX29RUkNvZGUpO1xuICAgICAgICB0aGlzLm1ha2VJbWFnZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNYWtlIHRoZSBJbWFnZSBmcm9tIENhbnZhcyBlbGVtZW50XG4gICAgICogLSBJdCBvY2N1cnMgYXV0b21hdGljYWxseVxuICAgICAqIC0gQW5kcm9pZCBiZWxvdyAzIGRvZXNuJ3Qgc3VwcG9ydCBEYXRhLVVSSSBzcGVjLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBRUkNvZGUucHJvdG90eXBlLm1ha2VJbWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9vRHJhd2luZy5tYWtlSW1hZ2UgPT0gXCJmdW5jdGlvblwiICYmICghdGhpcy5fYW5kcm9pZCB8fCB0aGlzLl9hbmRyb2lkID49IDMpKSB7XG4gICAgICAgICAgICB0aGlzLl9vRHJhd2luZy5tYWtlSW1hZ2UoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbGVhciB0aGUgUVJDb2RlXG4gICAgICovXG4gICAgUVJDb2RlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fb0RyYXdpbmcuY2xlYXIoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgUVJDb2RlLkNvcnJlY3RMZXZlbFxuICAgICAqL1xuICAgIFFSQ29kZS5Db3JyZWN0TGV2ZWwgPSBRUkVycm9yQ29ycmVjdExldmVsO1xufSkoKTtcblxuZXhwb3J0cy5RUkNvZGUgPSBRUkNvZGU7XG5cbiJdfQ==
(1)
});
