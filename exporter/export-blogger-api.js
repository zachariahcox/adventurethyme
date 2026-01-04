import fs from 'fs/promises';
import path from 'path';
import TurndownService from 'turndown';
import sanitize from 'sanitize-filename';

/**
 * Blogger API v3 Exporter
 * 
 * Usage:
 *   node export-blogger-api.js --fetch    # Fetch posts from API and save as JSON
 *   node export-blogger-api.js            # Process existing JSON files to markdown
 *   node export-blogger-api.js --all      # Fetch and process in one go
 * 
 * Setup:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project (or select existing)
 * 3. Enable the "Blogger API v3" at: APIs & Services → Library → Search "Blogger"
 * 4. Create an API key at: APIs & Services → Credentials → Create Credentials → API Key
 * 5. Set your API key via BLOGGER_API_KEY environment variable
 */

// Configuration
const BLOGGER_API_KEY = process.env.BLOGGER_API_KEY || 'YOUR_API_KEY_HERE';
const BLOG_URL = 'https://adventurethyme.blogspot.com';
const RAW_DIR = './raw';           // Where raw JSON posts are saved
const OUTPUT_DIR = './output/adventurethyme';  // Final output
const MAX_RESULTS_PER_PAGE = 50;

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFetch = args.includes('--fetch') || args.includes('--all');
const shouldProcess = !args.includes('--fetch') || args.includes('--all');

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

async function main() {
  console.log('🔍 Blogger API v3 Exporter\n');

  try {
    if (shouldFetch) {
      await runFetchStage();
    }

    if (shouldProcess) {
      await runProcessStage();
    }

    if (!shouldFetch && !shouldProcess) {
      console.log('Usage:');
      console.log('  node export-blogger-api.js --fetch    # Fetch posts from API');
      console.log('  node export-blogger-api.js            # Process existing JSON files');
      console.log('  node export-blogger-api.js --all      # Fetch and process');
    }

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

// =============================================================================
// STAGE 1: FETCH
// =============================================================================

async function runFetchStage() {
  console.log('📥 STAGE 1: Fetching posts from Blogger API...\n');

  if (BLOGGER_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ Please set your Blogger API key!');
    console.log('\nRun: BLOGGER_API_KEY=your_key node export-blogger-api.js --fetch');
    process.exit(1);
  }

  // Create raw directory
  await fs.mkdir(RAW_DIR, { recursive: true });

  // Get blog info
  const blog = await getBlogByUrl(BLOG_URL);
  console.log(`📚 Blog: ${blog.name}`);
  console.log(`   Posts: ${blog.posts?.totalItems || 'unknown'}\n`);

  // Save blog metadata
  await fs.writeFile(
    path.join(RAW_DIR, '_blog.json'),
    JSON.stringify(blog, null, 2)
  );

  // Fetch all posts
  const posts = await getAllPosts(blog.id);
  console.log(`\n📥 Fetched ${posts.length} posts\n`);

  // Save each post as individual JSON file
  for (const post of posts) {
    // Use title if available, otherwise fall back to post ID
    const baseName = post.title?.trim() 
      ? sanitize(post.title.toLowerCase().replace(/\s+/g, '-'))
      : `untitled-${post.id}`;
    const filename = baseName + '.json';
    await fs.writeFile(
      path.join(RAW_DIR, filename),
      JSON.stringify(post, null, 2)
    );
    console.log(`   💾 Saved: ${filename}`);
  }

  console.log(`\n✅ Fetch complete! ${posts.length} posts saved to ${RAW_DIR}/`);
  console.log('   Run without --fetch to process these files.\n');
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

// =============================================================================
// STAGE 2: PROCESS
// =============================================================================

async function runProcessStage() {
  console.log('📝 STAGE 2: Processing JSON files to Markdown...\n');

  // Check if raw directory exists
  try {
    await fs.access(RAW_DIR);
  } catch {
    console.error(`❌ No raw files found in ${RAW_DIR}/`);
    console.log('   Run with --fetch first to download posts.');
    process.exit(1);
  }

  // Create output directory structure
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'posts'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'assets', 'images'), { recursive: true });

  // Read blog metadata
  let blog = { name: 'Blog', description: '', url: BLOG_URL };
  try {
    const blogData = await fs.readFile(path.join(RAW_DIR, '_blog.json'), 'utf-8');
    blog = JSON.parse(blogData);
  } catch {
    console.log('   ⚠️  No _blog.json found, using defaults');
  }

  // Get all JSON files (except _blog.json)
  const files = await fs.readdir(RAW_DIR);
  const postFiles = files.filter(f => f.endsWith('.json') && f !== '_blog.json');

  console.log(`   Found ${postFiles.length} posts to process\n`);

  // Process each post
  for (const filename of postFiles) {
    const filePath = path.join(RAW_DIR, filename);
    const postData = await fs.readFile(filePath, 'utf-8');
    const post = JSON.parse(postData);
    await processPost(post);
  }

  console.log(`\n✅ Processing complete! Output: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. cd ' + OUTPUT_DIR);
  console.log('2. git init && git add . && git commit -m "Import from Blogger"');
  console.log('3. Push to GitHub and enable Pages');
}

async function processPost(post) {
  console.log(`   📝 Processing: ${post.title}`);

  try {
    // Convert HTML content to Markdown
    let markdown = turndownService.turndown(post.content || '');

    // Fix bullet point inconsistencies
    markdown = markdown.replace(/^-\s+\*\s+/gm, '* ');

    // Format ingredients as tables (recipe-specific)
    markdown = formatIngredientsTables(markdown);

    // Extract date from the API response
    const publishDate = post.published.split('T')[0];

    // Handle empty titles
    const title = post.title?.trim() || `Untitled Post (${post.id})`;

    // Create frontmatter with all available metadata
    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${publishDate}
original_link: ${post.url}
author: ${post.author?.displayName || 'Unknown'}
labels: [${(post.labels || []).map(l => `"${l}"`).join(', ')}]
---

`;

    // Combine frontmatter and content
    const fullContent = frontmatter + markdown;

    // Create sanitized filename
    const baseName = post.title?.trim()
      ? sanitize(post.title.toLowerCase().replace(/\s+/g, '-'))
      : `untitled-${post.id}`;
    const filename = `${baseName}.md`;

    // Save to file
    await fs.writeFile(path.join(OUTPUT_DIR, 'posts', filename), fullContent);

    // Download images
    await downloadImages(post.content || '', post.images || []);

  } catch (error) {
    console.error(`      ⚠️  Error: ${error.message}`);
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
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const imageUrls = new Set();
  
  let match;
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    imageUrls.add(match[1]);
  }
  
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
      
      let filename = path.basename(new URL(imageUrl).pathname);
      if (!filename || filename === '/') {
        filename = `image-${Date.now()}.jpg`;
      }
      filename = filename.split('?')[0];
      
      const outputPath = path.join(OUTPUT_DIR, 'assets', 'images', filename);
      await fs.writeFile(outputPath, Buffer.from(buffer));
      console.log(`      📸 Downloaded: ${filename}`);
    } catch {
      // Silently skip failed image downloads
    }
  }
}

// Run
main();
