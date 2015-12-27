<?php
/**
 * Plugin Name: Adblock to Bitcoin
 * Plugin URI: https://github.com/owocki/adblock-to-bitcoin/tree/master/wordpress-plugin
 * Description:  A simple way of turning ads into bitcoin donation solicitations when adblock is enabled.  IMPORTANT: Set your bitcoin address in Settings > Block Ads to Bitcoin.
 * Version: 0.2
 * Author: owocki
 * Author URI: http://owocki.com
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */


/* debug, remove in production */


require_once  plugin_dir_path( __FILE__ ) . "helpers.php";
require_once  plugin_dir_path( __FILE__ ) . "settings.php";


function a2b_add_script_footer() {
    global $post;
    if (!isset($post)) return;

    echo a2b_get_bitcoin_address_template();
}
add_action('wp_footer', 'a2b_add_script_footer');
add_action( 'wp_enqueue_scripts', 'a2b_queue_css' );
add_action( 'wp_enqueue_scripts', 'a2b_queue_js' );

?>
