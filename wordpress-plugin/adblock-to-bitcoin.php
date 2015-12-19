<?php
/**
 * Plugin Name: Adblock to Bitcoin
 * Plugin URI: https://github.com/owocki/adblock-to-bitcoin
 * Description:  A simple way of turning ads into bitcoin donation solicitations when adblock is enabled.  IMPORTANT: Set your bitcoin address in Settings > adblock-to-bitcoin.
 * Version: 0.1
 * Author: owocki
 * Author URI: http://owocki.com
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */


/* debug, remove in production */
error_reporting(E_ALL);
ini_set('display_errors', 1);


require_once  plugin_dir_path( __FILE__ ) . "helpers.php";
require_once  plugin_dir_path( __FILE__ ) . "settings.php";

function a2b_add_header() {
    global $post;
    if (!isset($post)) return;
    echo "<!-- start adblock-to-bitcoin -->";
    echo get_css();
    echo "<!-- end adblock-to-bitcoin -->";
}

function a2b_add_script_footer() {
    global $post;
    if (!isset($post)) return;

    echo "<!-- start adblock-to-bitcoin -->";
    echo get_js();
    echo get_bitcoin_address_template();
    echo "<!-- end adblock-to-bitcoin -->";
}
add_action('wp_head', 'a2b_add_header');
add_action('wp_footer', 'a2b_add_script_footer');


?>