=== Plugin Name ===
Contributors: owocki
Donate link: http://github.com/owocki
Tags: adblock, bitcoin, monetization
Requires at least: 4.4
Tested up to: 4.4
Stable tag: 4.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

adblock-to-bitcoin is a wordpress blocks that allows publishers to monetize unused adspace when adblockers are on.  

== Description ==

adblock-to-bitcoin is a wordpress blocks that allows publishers to monetize unused adspace when adblockers are on.  It turns ads into bitcoin donation solicitations when adblockers are enabled.   

* Supports 4 ad sizes natively
* Allows customized suggested donation amounts.
* Allows customized ad copy.
* Supports multiple adblockers.

== Installation ==


1. Install/Activate the plugin.
2. In your WP Admin, navigate to _Settings > adblock-to-bitcoin _.
3. Update your bitcoin address, and any other settings you may care to modify (copy, suggested donation amount, etc).
    1. Don't have a bitcoin address?  Create an account with coinbase and get one here: https://support.coinbase.com/customer/portal/articles/1027432-where-is-my-wallet-address-.
4. Add code to your templates whereever you'd like the plugin to display a bitcoin solicitation: 


### Leaderboard (728 x 90px)

```
<?php if(function_exists('a2b_leaderboard')) { echo a2b_leaderboard(); } ?>
```

### Large Rectangle (336px x 280px)
```
<?php if(function_exists('a2b_large_rectangle')) { echo a2b_large_rectangle(); } ?>
```

### Leaderboard (320 x 100px)
```
<?php if(function_exists('a2b_mobile_banner')) { echo a2b_mobile_banner(); } ?>
```

### Large SkyScraper (300 x 600px)
```
<?php if(function_exists('a2b_large_skyscraper')) { echo a2b_large_skyscraper(); } ?>
```


== Frequently Asked Questions ==

= How much can I expect to monetize with adblock-to-bitcoin? =

I've seen CPMs of over $2.  More details here => http://owocki.com/adblock-to-bitcoin-2-dollar-cpms-via-micropayments/

== Screenshots ==

1. screenshot-1.png
2. screenshot-2.png
3. screenshot-3.png

== Changelog ==

= 0.1 =
* Plugin MVP

== Upgrade Notice ==

= 0.1 =
* Plugin MVP

