ad_ids = [ 'rhs_block', // google right hand side
    'tads', // google top ads
    'pagelet_ego_pane', //facebook right hand side
    'add', //google adsense
    ]
ad_classes = [ 'ego_column', //facebook right hand side
    'ego_unit_container', //facebook right hand side 
    'adfuel-rendered', //cnn, right hand side
     ]


function render_bitcoin_solicitation(ele){
    var bat = document.createElement("div");
    bat.innerHTML = '<div id="bitcoin-address-template" class="bitcoin-address-container" hidden>' + 
        '' + 
        '    <div>' + 
        '        <span class="bitcoin-address"></span>' + 
        '    </div>' + 
        '' + 
        '    <a href="#" class="bitcoin-address-action bitcoin-address-action-send">' + 
        '        <i class="fa fa-btc"></i>' + 
        '        Donate from wallet' + 
        '    </a>' + 
        '' + 
        '    <a href="#" class="bitcoin-address-action bitcoin-address-action-copy">' + 
        '        <i class="fa fa-copy"></i>' + 
        '        Copy Address' + 
        '    </a>' + 
        '' + 
        '    <a href="#" class="bitcoin-address-action bitcoin-address-action-qr">' + 
        '        <i class="fa fa-qrcode"></i>' + 
        '        View QR code' + 
        '    </a>' + 
        '' + 
        '    <div class="bitcoin-action-hint bitcoin-action-hint-send">' + 
        '        Sending payment to the address from locally installed Bitcoin wallet app.' + 
        '    </div>' + 
        '' + 
        '    <div class="bitcoin-action-hint bitcoin-action-hint-copy">' + 
        '        Press CTRL + C or &#x2318; + C to copy the Bitcoin address.' + 
        '    </div>' + 
        '' + 
        '    <div class="bitcoin-action-hint bitcoin-action-hint-qr">' + 
        '        <p>' + 
        '            Scan the QR code with your mobile Bitcoin app to' + 
        '            make the payment:' + 
        '        </p>' + 
        '' + 
        '        <div class="bitcoin-address-qr-container">' + 
        '            <!-- Filled in by JS on action click -->' + 
        '        </div>' + 
        '    </div>' + 
        '' + 
        '</div>';
    document.getElementsByTagName('body')[0].appendChild(bat);

    var width = ele.offsetWidth;
    var height = ele.offsetHeight;

    var padding_top="0px";
    if(height>330){
        padding_top=parseInt((height-330)/2)+"px";
    }

    var domain = document.domain.replace('www.','');
    var bitcoin_address = '1Mfe1HsWidckKohULYniDmDN3aExsJeQpN'; //todo -- give publishers the ability to register their domains for an address.
    var sol_class = '';
    var suggested_donation_amount = '0.50';
    ele.className = ele.className + ' a2b_me';
    ele.innerHTML = '<div class="bitcoin_solicitation '+sol_class+'" style="width:'+width+'px; height:'+height+'px; padding-top:'+padding_top+' "> '+
                    '    <p>Hey there! You have an <strong>ad blocker enabled</strong>. <span class="sitename">'+domain+'</span> is an ad-supported site.  Would you consider giving a small donation to cover their servers, power, rent, staff, and protect their independence?  Suggested donation <span id="donation-usd" data-usd-amount="'+suggested_donation_amount+'" >$'+suggested_donation_amount+'</span>.'+
                    '    <p class="text-center">'+
                    '        <strong class="bitcoin-address" data-bc-amount="0.0013" data-bc-address="'+bitcoin_address+'">'+bitcoin_address+'</strong>'+
                    '    </p>'+
                    '</div>';

    $('.bitcoin-address, .bitcoin-address-container').each(function(e){
        $(this).attr('data-bc-message',document.location);
    });

}

function blockIds(element, index, array){
    var ele = document.getElementById(element);
    if(!ele)
        return;
    render_bitcoin_solicitation(ele);
}
function blockClasses(element, index, array){
    var eles = document.getElementsByClassName(element);
    for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        render_bitcoin_solicitation(ele);
    }
}

ad_ids.forEach(blockIds);
ad_classes.forEach(blockClasses);



