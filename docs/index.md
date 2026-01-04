---
layout: default
---
A collection of recipes gathered and refined over the years, from classics like Spaghetti and Meatballs to international dishes like Palak Paneer and Thai Sweet Potato Chicken Curry.

## Recent Recipes

{%- assign recipe_pages = site.pages | where_exp: "page", "page.path contains 'posts/'" -%}
{%- assign sorted_recipes = recipe_pages | sort: 'date' | reverse -%}
{%- for recipe in sorted_recipes limit:5 %}
* [{{ recipe.title }}]({{ recipe.url | relative_url }}) - {{ recipe.date | date: "%B %d, %Y" }}
{%- endfor %}

## All Recipes

{%- assign alphabetical_recipes = recipe_pages | sort: 'title' -%}
{%- for recipe in alphabetical_recipes %}
* [{{ recipe.title }}]({{ recipe.url | relative_url }})
{%- endfor %}