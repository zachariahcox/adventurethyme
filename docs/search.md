---
layout: default
title: Search
permalink: /search/
---

# Search Recipes

<div class="search-container">
  <input type="text" id="search-input" placeholder="Search for recipes...">
  <ul id="results-container"></ul>
</div>

<!-- Script pointing to simple-jekyll-search.min.js -->
<script src="https://cdn.jsdelivr.net/npm/simple-jekyll-search@1.10.0/dest/simple-jekyll-search.min.js"></script>

<script>
  window.simpleJekyllSearch = new SimpleJekyllSearch({
    searchInput: document.getElementById('search-input'),
    resultsContainer: document.getElementById('results-container'),
    json: '{{ site.baseurl }}/search.json',
    searchResultTemplate: '<li><div class="search-result"><a href="{url}">{title}</a> - <span class="search-date">{date}</span><div class="search-snippet">{content}</div></div></li>',
    noResultsText: 'No results found',
    limit: 15,
    fuzzy: false
  });
</script>

<style>
  .search-container {
    margin: 20px 0;
  }
  
  #search-input {
    width: 100%;
    max-width: 600px;
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  #results-container {
    margin-top: 15px;
    padding-left: 0;
  }
  
  #results-container li {
    list-style: none;
    margin-bottom: 10px;
    padding: 8px;
    background: #f9f9f9;
    border-radius: 4px;
  }
  
  #results-container li:hover {
    background: #f0f0f0;
  }
  
  .search-date {
    color: #666;
    font-size: 14px;
  }
</style>
