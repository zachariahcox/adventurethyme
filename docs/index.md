---
layout: default
---

# Welcome to Adventure Thyme

A collection of recipes gathered and refined over the years, from classics like Spaghetti and Meatballs to international dishes like Palak Paneer and Thai Sweet Potato Chicken Curry.

## Recent Recipes

{% assign sorted_recipes = site.recipes | sort: 'date' | reverse %}
{% for recipe in sorted_recipes limit:5 %}
* [{{ recipe.title }}]({{ recipe.url | relative_url }}) - {{ recipe.date | date: "%B %d, %Y" }}
{% endfor %}

## Recipe Categories

### Main Dishes
* [Chicken Biryani]({{ '/posts/chicken-biryani.html' | relative_url }})
* [Salmon Curry]({{ '/posts/salmon-curry.html' | relative_url }})
* [Filet Mignon and Cognac Pan Sauce]({{ '/posts/filet-mignon-and-cognac-pan-sauce.html' | relative_url }})
* [Pulled Pork in Slow Cooker]({{ '/posts/pulled-pork-in-slow-cooker.html' | relative_url }})
* [Strip Steaks, Desiccated and Seared]({{ '/posts/strip-steaks,-desiccated-and-seared.html' | relative_url }})

### Soups and Stews
* [Butternut Squash Soup]({{ '/posts/butternut-squash-soup.html' | relative_url }})
* [White Chicken Chili]({{ '/posts/white-chicken-chili.html' | relative_url }})
* [Ribollita (Vegetable Stew)]({{ '/posts/ribollita-(vegetable-stew).html' | relative_url }})
* [Borscht with Kielbasa]({{ '/posts/borscht-with-kielbasa.html' | relative_url }})
* [Tortilla Soup in Pressure Cooker]({{ '/posts/tortilla-soup-in-pressure-cooker.html' | relative_url }})

### Vegetarian Options
* [Palak Paneer]({{ '/posts/palak-paneer.html' | relative_url }})
* [Red Lentils with Kale]({{ '/posts/red-lentils-with-kale.html' | relative_url }})
* [Vegetarian Black Beans]({{ '/posts/vegetarian-black-beans.html' | relative_url }})
* [Spinach and Mushroom Lasagna]({{ '/posts/spinach-and-mushroom-lasagna.html' | relative_url }})
* [Chickpea, Cauliflower, and Cabbage Curry]({{ '/posts/chickpea,-cauliflower,-and-cabbage-curry.html' | relative_url }})

### Desserts
* [Nearly Flourless Chocolate Cake]({{ '/posts/nearly-flourless-chocolate-cake.html' | relative_url }})
* [Mixed Berry Cobbler]({{ '/posts/mixed-berry-cobbler.html' | relative_url }})
* [Fresh Berry Gratin]({{ '/posts/fresh-berry-gratin.html' | relative_url }})
* [Chocolate Chocolate Cookies]({{ '/posts/chocolate-chocolate-cookies.html' | relative_url }})
* [Pear Tatin]({{ '/posts/pear-tatin.html' | relative_url }})

## All Recipes

{% for recipe in sorted_recipes %}
* [{{ recipe.title }}]({{ recipe.url | relative_url }}) - {{ recipe.date | date: "%B %d, %Y" }}
{% endfor %}