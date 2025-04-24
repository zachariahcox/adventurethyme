---
layout: default
---

# Welcome to Adventure Thyme

A collection of recipes gathered and refined over the years, from classics like Spaghetti and Meatballs to international dishes like Palak Paneer and Thai Sweet Potato Chicken Curry.

**[Search All Recipes](/search)** - Find exactly what you're looking for!

## Recent Recipes

{% assign sorted_posts = site.posts | sort: 'date' | reverse %}
{% for post in sorted_posts limit:5 %}
* [{{ post.title }}]({{ post.url | relative_url }}) - {{ post.date | date: "%B %d, %Y" }}
{% endfor %}

## Recipe Categories

### Main Dishes
* [Chicken Biryani]({{ '/2011/01/04/chicken-biryani.html' | relative_url }})
* [Salmon Curry]({{ '/2011/01/04/salmon-curry.html' | relative_url }})
* [Filet Mignon and Cognac Pan Sauce]({{ '/2013/04/13/filet-mignon-and-cognac-pan-sauce.html' | relative_url }})
* [Pulled Pork in Slow Cooker]({{ '/2010/06/03/pulled-pork-in-slow-cooker.html' | relative_url }})
* [Strip Steaks, Desiccated and Seared]({{ '/2015/12/30/strip-steaks,-desiccated-and-seared.html' | relative_url }})

### Soups and Stews
* [Butternut Squash Soup]({{ '/2013/11/18/butternut-squash-soup.html' | relative_url }})
* [White Chicken Chili]({{ '/2011/01/04/white-chicken-chili.html' | relative_url }})
* [Ribollita (Vegetable Stew)]({{ '/2014/02/26/ribollita-(vegetable-stew).html' | relative_url }})
* [Borscht with Kielbasa]({{ '/2010/04/13/borscht-with-kielbasa.html' | relative_url }})
* [Tortilla Soup in Pressure Cooker]({{ '/2018/11/16/tortilla-soup-in-pressure-cooker.html' | relative_url }})

### Vegetarian Options
* [Palak Paneer]({{ '/2012/03/01/palak-paneer.html' | relative_url }})
* [Red Lentils with Kale]({{ '/2012/10/28/red-lentils-with-kale.html' | relative_url }})
* [Vegetarian Black Beans]({{ '/2015/12/29/vegetarian-black-beans.html' | relative_url }})
* [Spinach and Mushroom Lasagna]({{ '/2010/01/26/spinach-and-mushroom-lasagna.html' | relative_url }})
* [Chickpea, Cauliflower, and Cabbage Curry]({{ '/2011/01/04/chickpea,-cauliflower,-and-cabbage-curry.html' | relative_url }})

### Desserts
* [Nearly Flourless Chocolate Cake]({{ '/2024/06/30/nearly-flourless-chocolate-cake.html' | relative_url }})
* [Mixed Berry Cobbler]({{ '/2013/02/04/mixed-berry-cobbler.html' | relative_url }})
* [Fresh Berry Gratin]({{ '/2013/06/20/fresh-berry-gratin.html' | relative_url }})
* [Chocolate Chocolate Cookies]({{ '/2012/12/09/chocolate-chocolate-cookies.html' | relative_url }})
* [Pear Tatin]({{ '/2018/10/27/pear-tatin.html' | relative_url }})

## All Recipes

{% for post in sorted_posts %}
* [{{ post.title }}]({{ post.url | relative_url }}) - {{ post.date | date: "%B %d, %Y" }}
{% endfor %}