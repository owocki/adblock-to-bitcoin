=== Plugin Name ===
Contributors: owocki
Donate link: http://github.com/owocki
Tags: blocked ads, adblock, bitcoin, monetization
Requires at least: 4.4
Tested up to: 4.4
Stable tag: 4.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Block Ads to Bitcoin is a wordpress blocks that allows publishers to monetize unused adspace when adblockers are on.  

== Description ==

Block Ads to Bitcoin is a wordpress blocks that allows publishers to monetize unused adspace when adblockers are on.  It turns ads into bitcoin donation solicitations when adblockers are enabled.   

* Supports 4 ad sizes natively
* Allows customized suggested donation amounts.
* Allows customized ad copy.
* Supports multiple adblockers.

== Installation ==


1. Install/Activate the plugin.
2. In your WP Admin, navigate to _Settings > Block Ads to Bitcoin _.
3. Update your bitcoin address, and any other settings you may care to modify (copy, suggested donation amount, etc).
    1. Don't have a bitcoin address?  Create an account with coinbase and get one here: https://support.coinbase.com/customer/portal/articles/1027432-where-is-my-wallet-address-.
4. Add code to your templates whereever you'd like the plugin to display a bitcoin solicitation.  Here are some examples:


### Leaderboard (728 x 90px)

`<?php if(function_exists('a2b_leaderboard')) { echo a2b_leaderboard(); } ?>`

### Large Rectangle (336px x 280px)

`<?php if(function_exists('a2b_large_rectangle')) { echo a2b_large_rectangle(); } ?>`

### Leaderboard (320 x 100px)

`<?php if(function_exists('a2b_mobile_banner')) { echo a2b_mobile_banner(); } ?>`

### Large SkyScraper (300 x 600px)

`<?php if(function_exists('a2b_large_skyscraper')) { echo a2b_large_skyscraper(); } ?>`


== Frequently Asked Questions ==

= What is bitcoin? =

Bitcoin is a form of digital currency, created and held electronically. No one controls it. Bitcoins aren’t printed, like dollars or euros – they’re produced by people, and increasingly businesses, running computers all around the world, using software that solves mathematical problems.

= Why bitcoin? =

It’s cheap

With credit card transactions, your merchant account bills you on a per-transaction basis. Some merchant accounts will charge a fee for debit card transactions, as you have to pay a ‘swipe fee’. Bitcoin transaction fees are minimal, or in some cases free.

It’s as private as you want it to be

Sometimes, we don’t want people knowing what we have purchased. Bitcoin is a relatively private currency. On the one hand, it is transparent – thanks to the blockchain, everyone knows how much a particular bitcoin address holds in transactions. They know where those transactions came from, and where they’re sent. On the other hand, unlike conventional bank accounts, no one knows who holds a particular bitcoin address.

You don’t need to trust anyone else

In a conventional banking system, you have to trust people to handle your money properly along the way. You have to trust the bank, for example. You might have to trust a third-party payment processor. You’ll often have to trust the merchant too.

[More on why bitcion is an important payment layer here](http://www.coindesk.com/information/why-use-bitcoin/)

= Why adblockers? =

We are in a macro environment in which publishers are openly wondering where their revenues are going to come from in 20 years.  On a micro scale, there has been a lot of ink (and bits) spilled about the resounding need for change in the ad and publishing space *today*.  Some analysis’ have shown that 9.26% of impressions were found to be ad-blocked, with some sites reaching as high as 50%  While there is innovation happening in online payments, no one has yet connected the dots in a meaningful way.

= Why Block Ads to Bitcoin =

Block Ads to Bitcoin is a free and easy way to monetize ad space that is unused due to adblockers.

= How much can I expect to monetize with Block Ads to Bitcoin? =

I've seen CPMs of over $2.00.  More details here => http://owocki.com/adblock-to-bitcoin-2-dollar-cpms-via-micropayments/


== Screenshots ==

1. screenshot-1.png
2. screenshot-2.png
3. screenshot-3.png
3. screenshot-4.png

== Changelog ==

= 0.2 =
* Wordpress submission guideilnes https://github.com/owocki/adblock-to-bitcoin/pull/4/files

= 0.1 =
* Plugin MVP

== Upgrade Notice ==

= 0.1 =
* Plugin MVP

