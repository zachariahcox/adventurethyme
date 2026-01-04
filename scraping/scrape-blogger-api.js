import fs from 'fs/promises';
import path from 'path';
import TurndownService from 'turndown';
import sanitize from 'sanitize-filename';

/**
 * Blogger API v3 Scraper
 * 
 * Setup:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project (or select existing)
 * 3. Enable the "Blogger API v3" at: APIs & Services → Library → Search "Blogger"
 * 4. Create an API key at: APIs & Services → Credentials → Create Credentials → API Key
 * 5. Set your API key below or via BLOGGER_API_KEY environment variable
 */

// Configuration
const BLOGGER_API_KEY = process.env.BLOGGER_API_KEY || 'YOUR_API_KEY_HERE';
const BLOG_URL = 'https://adventurethyme.blogspot.com';
const OUTPUT_DIR = './adventurethyme';
const MAX_RESULTS_PER_PAGE = 50; // Max allowed by API is 500, but 50 is safer

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

async function main() {
  console.log('🔍 Starting Blogger API v3 export...\n');

  if (BLOGGER_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Please set your Blogger API key!');
    console.log('\nSetup instructions:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create/select a project');
    console.log('3. Enable "Blogger API v3" in APIs & Services → Library');
    console.log('4. Create an API key in APIs & Services → Credentials');
    console.log('5. Run: BLOGGER_API_KEY=your_key node scrape-blogger-api.js');
    process.exit(1);
  }

  try {
    // Create output directory structure
    await createDirectoryStructure();

    // Get blog info
    const blog = await getBlogByUrl(BLOG_URL);
    console.log(`📚 Blog: ${blog.name}`);
    console.log(`   Posts: ${blog.posts?.totalItems || 'unknown'}\n`);

    // Fetch all posts
    const posts = await getAllPosts(blog.id);
    console.log(`\n📥 Fetched ${posts.length} posts\n`);

    // Process each post
    for (const post of posts) {
      await processPost(post);
    }

    // Create README and config
    await createReadme(blog);
    await createGitHubPagesConfig(blog);

    console.log(`\n✅ Export complete! Output: ${OUTPUT_DIR}`);
    console.log('\nNext steps:');
    console.log('1. cd ' + OUTPUT_DIR);
    console.log('2. git init && git add . && git commit -m "Import from Blogger"');
    console.log('3. Push to GitHub and enable Pages');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('403')) {
      console.log('\n⚠️  API access denied. Check that:');
      console.log('   - Blogger API v3 is enabled in your Google Cloud project');
      console.log('   - Your API key is correct');
      console.log('   - The blog is public');
    }
    process.exit(1);
  }
}

async function createDirectoryStructure() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'posts'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'assets', 'images'), { recursive: true });
}

async function getBlogByUrl(blogUrl) {
  const apiUrl = `https://www.googleapis.com/blogger/v3/blogs/byurl?url=${encodeURIComponent(blogUrl)}&key=${BLOGGER_API_KEY}`;
  
  const response = await fetch(apiUrl);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get blog: ${error.error?.message || response.statusText}`);
  }
  
  return response.json();
}

async function getAllPosts(blogId) {
  const posts = [];
  let pageToken = null;

  do {
    const url = new URL(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`);
    url.searchParams.set('key', BLOGGER_API_KEY);
    url.searchParams.set('maxResults', MAX_RESULTS_PER_PAGE);
    url.searchParams.set('fetchBodies', 'true');
    url.searchParams.set('fetchImages', 'true');
    
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    console.log(`📄 Fetching posts... (${posts.length} so far)`);
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch posts: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.items) {
      posts.push(...data.items);
    }

    pageToken = data.nextPageToken;

  } while (pageToken);

  return posts;
}

async function processPost(post) {
  console.log(`📝 Processing: ${post.title}`);

  try {
    // Convert HTML content to Markdown
    let markdown = turndownService.turndown(post.content || '');

    // Fix bullet point inconsistencies
    markdown = markdown.replace(/^-\s+\*\s+/gm, '* ');

    // Format ingredients as tables (recipe-specific)
    markdown = formatIngredientsTables(markdown);

    // Extract date from the API response (guaranteed accurate!)
    const publishDate = post.published.split('T')[0];

    // Create frontmatter with all available metadata
    const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: ${publishDate}
original_link: ${post.url}
author: ${post.author?.displayName || 'Unknown'}
labels: [${(post.labels || []).map(l => `"${l}"`).join(', ')}]
---

`;

    // Combine frontmatter and content
    const fullContent = frontmatter + markdown;

    // Create sanitized filename
    const filename = `${sanitize(post.title.toLowerCase().replace(/\s+/g, '-'))}.md`;

    // Save to file
    await fs.writeFile(path.join(OUTPUT_DIR, 'posts', filename), fullContent);

    // Download images
    await downloadImages(post.content || '', post.images || []);

  } catch (error) {
    console.error(`   ⚠️  Error processing "${post.title}": ${error.message}`);
  }
}

function formatIngredientsTables(markdown) {
  return markdown.replace(/(Ingredients:|Ingredients|## Ingredients)([\s\S]*?)(\n\n|$)/i, (match, header, ingredients) => {
    const sections = ingredients.split(/\n_[^_]+_\n/);
    
    if (sections.length > 1) {
      let result = `${header}\n\n`;
      const subSectionTitles = ingredients.match(/_[^_]+_/g) || [];
      
      let formattedSection = formatIngredientsAsTable(sections[0]);
      if (formattedSection.trim()) {
        result += formattedSection + '\n\n';
      }
      
      for (let i = 1; i < sections.length; i++) {
        const sectionTitle = subSectionTitles[i-1] || '';
        result += `${sectionTitle}\n\n` + formatIngredientsAsTable(sections[i]) + '\n\n';
      }
      
      return result;
    } else {
      return `${header}\n\n` + formatIngredientsAsTable(ingredients) + '\n\n';
    }
  });
}

function formatIngredientsAsTable(ingredientsText) {
  let cleanedText = ingredientsText
    .replace(/^-\s+\*\s+/gm, '')
    .replace(/^\*\s+/gm, '')
    .replace(/^-\s+/gm, '');
  
  const lines = cleanedText
    .split(/\n|\r/)
    .map(line => line.trim())
    .filter(line => line);
  
  if (lines.length === 0) return '';
  
  let table = "| Quantity | Ingredient |\n| -------- | ---------- |\n";
  
  lines.forEach(line => {
    const match = line.match(/^([\d\/\.\s]+\s*(?:tsp|tbsp|cup|cups|oz|ounce|ounces|lb|lbs|pound|pounds|g|kg|ml|l|pinch|dash|can|cans|clove|cloves|bunch|bunches|stalk|stalks|head|heads|piece|pieces|slice|slices|T|C))(.+)$/i);
    
    if (match) {
      table += `| ${match[1].trim()} | ${match[2].trim()} |\n`;
    } else {
      table += `|  | ${line.trim()} |\n`;
    }
  });
  
  return table;
}

async function downloadImages(htmlContent, apiImages) {
  // Extract image URLs from HTML content
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const imageUrls = new Set();
  
  let match;
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    imageUrls.add(match[1]);
  }
  
  // Also add any images from the API response
  for (const img of apiImages) {
    if (img.url) {
      imageUrls.add(img.url);
    }
  }

  for (const imageUrl of imageUrls) {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) continue;
      
      const buffer = await response.arrayBuffer();
      
      // Generate a filename from the URL
      let filename = path.basename(new URL(imageUrl).pathname);
      if (!filename || filename === '/') {
        filename = `image-${Date.now()}.jpg`;
      }
      filename = filename.split('?')[0]; // Remove query params
      
      const outputPath = path.join(OUTPUT_DIR, 'assets', 'images', filename);
      await fs.writeFile(outputPath, Buffer.from(buffer));
      console.log(`   📸 Downloaded: ${filename}`);
    } catch (error) {
      // Silently skip failed image downloads
    }
  }
}

async function createReadme(blog) {
  const content = `# ${blog.name}

${blog.description || ''}

This repository contains content exported from Blogger using the Blogger API v3.

## Posts

Blog posts are in the \`posts/\` directory as Markdown files.

## Assets

Images are stored in \`assets/images/\`.

## Original Blog

[${blog.url}](${blog.url})
`;

  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), content);
}

async function createGitHubPagesConfig(blog) {
  const config = `title: ${blog.name}
description: ${blog.description || 'Exported from Blogger'}
theme: jekyll-theme-minimal
`;

  await fs.writeFile(path.join(OUTPUT_DIR, '_config.yml'), config);

  const index = `---
layout: default
---

# ${blog.name}

${blog.description || ''}

## Posts

{% for page in site.pages %}
{% if page.path contains 'posts/' %}
* [{{ page.title }}]({{ page.url | relative_url }})
{% endif %}
{% endfor %}
`;

  await fs.writeFile(path.join(OUTPUT_DIR, 'index.md'), index);
}

// Run
main();

