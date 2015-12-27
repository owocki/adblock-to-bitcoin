function showSolicitations() {
    $('.bitcoin_solicitation').addClass('adblock_enabled');
}
function adBlockDetected() {
    showSolicitations();
}
function adBlockNotDetected() {
}

// attach the document URL to qr-code generating attributes such that it will be sent by default in bitcoin payments.
// this will allow publishers to know what content is generating BTC for them.
$(document).ready(function(){
    $('.bitcoin-address, .bitcoin-address-container').each(function(e){
        $(this).attr('data-bc-message',document.location);
    });

    if(document.always_show_bitcoin_solicitations){
        showSolicitations();
    } else if(typeof fuckAdBlock === 'undefined') {
        adBlockDetected();
    } else {
        fuckAdBlock.setOption({ debug: true });
        fuckAdBlock.onDetected(adBlockDetected).onNotDetected(adBlockNotDetected);
    }

    function checkAgain() {
        $('#fuck-adb-enabled').hide();
        $('#fuck-adb-not-enabled').hide();
        // setTimeout 300ms for the recheck is visible when you click on the button
        setTimeout(function() {
            if(typeof fuckAdBlock === 'undefined') {
                adBlockDetected();
            } else {
                fuckAdBlock.onDetected(adBlockDetected).onNotDetected(adBlockNotDetected);
                fuckAdBlock.check();
            }
        }, 300);
    }


});
