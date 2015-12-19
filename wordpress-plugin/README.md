<img src="http://bits.owocki.com/0Y1M132D0O2o/adblock-to-bitcoin.png" >

# adblock-to-bitcoin wordpress plug

# What

Implements [adblock-to-bitcoin](https://github.com/owocki/adblock-to-bitcoin) natively on a wordpress blog.

# Download 

Download plugin [here](http://bits.owocki.com/0i451Y1n1V1J/wordpress-plugin.zip).

# How

1. Install/Activate the plugin.
1. In your WP Admin, navigate to _Settings > adblock-to-bitcoin _.
1. Update your bitcoin address, and any other settings you may care to modify (copy, suggested donation amount, etc).
    1. Don't have a bitcoin address?  Create an account with coinbase, <a href="https://support.coinbase.com/customer/portal/articles/1027432-where-is-my-wallet-address-">and get one here</a>.
1. Add code to your templates whereever you'd like the plugin to display a bitcoin solicitation: 


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

