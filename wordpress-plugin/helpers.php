<?php


function get_bitcoin_address(){
    $options = get_option( 'a2b_option_group' );
    $address = $options['bitcoin_address'];
    if(!$address){
        $address = '1A3KJ7f3YAS9jvhPjotLEzEMd1dNKZ9EPE';
    }
    return $address;
}

function get_suggested_donation_amount(){
    $options = get_option( 'a2b_option_group' );
    $suggested_donation_amount = $options['suggested_donation_amount'];
    if(!$suggested_donation_amount){
        $suggested_donation_amount = '0.50';
    }
    return $suggested_donation_amount;
}

function get_default_copy($sol_size=False){
    $suggested_donation_amount = get_suggested_donation_amount();
    $copy = 'Hey there!  You have an <strong>ad blocker enabled</strong>.  <span class="sitename">'.get_bloginfo('name').'</span> supports your right to do so, but would you consider supporting our costs via a <span class="smallbitcoin">small bitcoin donation?</span> 
        Suggested donation: $'.$suggested_donation_amount.' .';
    return $copy;
}


function get_copy($sol_size){
    $options = get_option( 'a2b_option_group' );
    $copy = $options['copy'];
    if(!$copy){
        $copy=get_default_copy($sol_size);
    }
    return $copy;
}


function should_display_even_if_adblock_is_off(){
    $options = get_option( 'a2b_option_group' );
    return (bool)$options['display_always'];
}


function get_plugin_staticfiles_url(){
    return get_site_url().'/wp-content/plugins/adblock-to-bitcoin/static/';
}


function get_js(){
    return '
    '.(should_display_even_if_adblock_is_off()? '<script type="text/javascript">document.always_show_bitcoin_solicitations=1;</script>).':'').'
    <script src="//netdna.bootstrapcdn.com/bootstrap/3.0.3/js/bootstrap.min.js"></script>
    <script src="'.get_plugin_staticfiles_url().'bitcoinaddress.js/dist/demo.js"></script>
    <script src="'.get_plugin_staticfiles_url().'FuckAdBlock/fuckadblock.js"></script>
    <script src="'.get_plugin_staticfiles_url().'adblock-to-bitcoin.js"></script>
    ';

}

function get_css(){
    return '
    <link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">
    <link href="'.get_plugin_staticfiles_url().'adblock-to-bitcoin.css" rel="stylesheet">
    ';

}

function get_bitcoin_address_template(){
return '
    <!-- Use HTML5 templates when they are more widespread http://www.html5rocks.com/en/tutorials/webcomponents/template/ -->
    <div id="bitcoin-address-template" class="bitcoin-address-container" hidden>

        <div>
            <span class="bitcoin-address"></span>
        </div>

        <a href="#" class="bitcoin-address-action bitcoin-address-action-send">
            <i class="fa fa-btc"></i>
            Donate from wallet
        </a>

        <a href="#" class="bitcoin-address-action bitcoin-address-action-copy">
            <i class="fa fa-copy"></i>
            Copy Address
        </a>

        <a href="#" class="bitcoin-address-action bitcoin-address-action-qr">
            <i class="fa fa-qrcode"></i>
            View QR code
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
    ';
}

function get_bitcion_solicitation($sol_size='leaderboard'){
    $suggested_donation_amount = get_suggested_donation_amount();
    $bitcoin_address = get_bitcoin_address();
    $copy = get_copy($sol_size);
    return '
    <div class="bitcoin_solicitation '.$sol_size.'">
        <p>'.$copy.'
        <span class="hidden" id="donation-usd" data-usd-amount="'.$suggested_donation_amount.'" >$'.$suggested_donation_amount.'</span>
        <p class="text-center">
            <strong class="bitcoin-address" data-bc-address="'.$bitcoin_address.'">'.$bitcoin_address.'</strong>
        </p>
    </div>
                ';
}

function a2b_leaderboard(){
    return get_bitcion_solicitation('leaderboard');
}

function a2b_large_rectangle(){
    return get_bitcion_solicitation('large-rectangle');
}

function a2b_mobile_banner(){
    return get_bitcion_solicitation('mobile-banner');
}
function a2b_large_skyscraper(){
    return get_bitcion_solicitation('large-skyscraper');
}

?>