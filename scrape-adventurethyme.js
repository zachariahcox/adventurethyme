import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import fetch from 'node-fetch';
import sanitize from 'sanitize-filename';

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Configuration (replace with your blogspot URL)
const blogspotUrl = 'https://adventurethyme.blogspot.com'; // Replace with your Blogspot URL
const outputDir = './adventurethyme';

async function main() {
  console.log(`🔍 Starting conversion of ${blogspotUrl} to GitHub repository format`);
  
  try {
    // Create output directory structure
    await createDirectoryStructure();
    
    // Fetch the blog's feed to get posts
    const posts = await fetchBlogPosts();
    
    // Process each post
    for (const post of posts) {
      await processPost(post);
    }
    
    // Create README.md
    await createReadme();
    
    // Create a basic GitHub Pages config if needed
    await createGitHubPagesConfig();
    
    console.log(`✅ Conversion complete! Your GitHub repository is ready in: ${outputDir}`);
    console.log('\nNext steps:');
    console.log('1. Navigate to the output directory: cd ' + outputDir);
    console.log('2. Initialize a Git repository: git init');
    console.log('3. Add all files: git add .');
    console.log('4. Commit changes: git commit -m "Initial commit from Blogspot"');
    console.log('5. Create a new repository on GitHub');
    console.log('6. Push to GitHub: git remote add origin YOUR_GITHUB_REPO_URL && git push -u origin main');
  } catch (error) {
    console.error('❌ Error during conversion:', error);
  }
}

async function createDirectoryStructure() {
  console.log('📁 Creating directory structure...');
  
  // Create main directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Create posts directory
  await fs.mkdir(path.join(outputDir, 'posts'), { recursive: true });
  
  // Create assets directory for images
  await fs.mkdir(path.join(outputDir, 'assets', 'images'), { recursive: true });
}

async function fetchBlogPosts() {
  console.log('📥 Fetching blog posts...');

  const posts = [];
  let nextPageUrl = blogspotUrl;

  while (nextPageUrl) {
    console.log(`Fetching from: ${nextPageUrl}`);

    try {
      const response = await fetch(nextPageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);

      // Extract posts from the current page
      const postElements = dom.window.document.querySelectorAll('.post');
      for (const post of postElements) {
        const titleEl = post.querySelector('.post-title a');
        const title = titleEl?.textContent || 'Untitled Post';
        const link = titleEl?.href || '';
        const dateEl = post.querySelector('.date-header');
        const pubDate = dateEl?.textContent || '';

        posts.push({ title, link, pubDate, description: '' });
      }

      // Find the "Older Posts" link for pagination
      const olderPostsLink = dom.window.document.querySelector('a.blog-pager-older-link');
      nextPageUrl = olderPostsLink ? olderPostsLink.href : null;
    } catch (error) {
      console.error('Error fetching posts:', error);
      break;
    }
  }

  console.log(`Found ${posts.length} posts`);
  return posts;
}

async function processPost(post) {
  console.log(`📝 Processing post: ${post.title}`);

  try {
    // Fetch the full post content
    const response = await fetch(post.link);
    const html = await response.text();
    const dom = new JSDOM(html);

    // Extract the post content (this selector may need adjustment based on your Blogspot theme)
    const postContent = dom.window.document.querySelector('.post-body, .entry-content')?.innerHTML || '';

    // Convert HTML to Markdown
    let markdown = turndownService.turndown(postContent);

    // Fix bullet point inconsistencies (remove mixed formats like "- *")
    markdown = markdown.replace(/^-\s+\*\s+/gm, '* ');

    // Standardize the ingredients section into tables
    markdown = markdown.replace(/(Ingredients:|Ingredients|## Ingredients)([\s\S]*?)(\n\n|$)/i, (match, header, ingredients) => {
      // Check if there are sub-sections in the ingredients
      const sections = ingredients.split(/\n_[^_]+_\n/);
      
      if (sections.length > 1) {
        // Handle multiple ingredient sections
        let result = `${header}\n\n`;
        const subSectionTitles = ingredients.match(/_[^_]+_/g) || [];
        
        // The first section doesn't have a title in the split
        let formattedSection = formatIngredientsAsTable(sections[0]);
        if (formattedSection.trim()) {
          result += formattedSection + '\n\n';
        }
        
        // Process remaining sections with their titles
        for (let i = 1; i < sections.length; i++) {
          const sectionTitle = subSectionTitles[i-1] || '';
          result += `${sectionTitle}\n\n` + formatIngredientsAsTable(sections[i]) + '\n\n';
        }
        
        return result;
      } else {
        // Handle single ingredient section
        return `${header}\n\n` + formatIngredientsAsTable(ingredients) + '\n\n';
      }
    });
    
    // Helper function to convert ingredient lines to a table
    function formatIngredientsAsTable(ingredientsText) {
      // Clean up any mixed bullet point formats and standardize to simple lines
      let cleanedText = ingredientsText
        .replace(/^-\s+\*\s+/gm, '')  // Remove "- * " prefix
        .replace(/^\*\s+/gm, '')      // Remove "* " prefix
        .replace(/^-\s+/gm, '');      // Remove "- " prefix
      
      const lines = cleanedText
        .split(/\n|\r/)
        .map(line => line.trim())
        .filter(line => line);
      
      if (lines.length === 0) return '';
      
      // Add table header
      let table = "| Quantity | Ingredient |\n| -------- | ---------- |\n";
      
      // Process each ingredient line
      lines.forEach(line => {
        // Try to separate quantity from ingredient name
        const match = line.match(/^([\d\/\.\s]+\s*(?:tsp|tbsp|cup|cups|oz|ounce|ounces|lb|lbs|pound|pounds|g|kg|ml|l|pinch|dash|can|cans|clove|cloves|bunch|bunches|stalk|stalks|head|heads|piece|pieces|slice|slices|T|C))(.+)$/i);
        
        if (match) {
          // Successfully separated quantity and ingredient
          table += `| ${match[1].trim()} | ${match[2].trim()} |\n`;
        } else {
          // Couldn't separate, put everything in the ingredient column
          table += `|  | ${line.trim()} |\n`;
        }
      });
      
      return table;
    }

    // Extract date for filename
    let date = '';
    try {
      // Method 1: Try to parse the date from the pubDate string
      if (post.pubDate) {
        const parsedDate = new Date(post.pubDate);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
        }
      }
      
      // Method 2: Try to find a date in the post content itself
      if (!date) {
        // Look for common date patterns in the HTML
        const dateMatches = html.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})|(\w+)\s+(\d{1,2})(st|nd|rd|th)?,?\s+(\d{4})|(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        
        if (dateMatches) {
          let extractedDate;
          // Try to parse the found date
          try {
            // Different formats might match different groups
            if (dateMatches[1] && dateMatches[2] && dateMatches[3]) {
              // MM/DD/YYYY or DD/MM/YYYY
              extractedDate = new Date(`${dateMatches[3]}-${dateMatches[2]}-${dateMatches[1]}`);
              if (isNaN(extractedDate.getTime())) {
                extractedDate = new Date(`${dateMatches[3]}-${dateMatches[1]}-${dateMatches[2]}`);
              }
            } else if (dateMatches[4] && dateMatches[5] && dateMatches[7]) {
              // Month Name Day, Year (e.g., January 15th, 2014)
              const monthMap = {
                'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
                'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
              };
              const month = monthMap[dateMatches[4].toLowerCase()];
              const day = dateMatches[5].padStart(2, '0');
              const year = dateMatches[7];
              if (month) {
                extractedDate = new Date(`${year}-${month}-${day}`);
              }
            } else if (dateMatches[8] && dateMatches[9] && dateMatches[10]) {
              // YYYY/MM/DD
              extractedDate = new Date(`${dateMatches[8]}-${dateMatches[9]}-${dateMatches[10]}`);
            }
            
            if (extractedDate && !isNaN(extractedDate.getTime())) {
              date = extractedDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn(`Error parsing content date: ${e.message}`);
          }
        }
      }
      
      // Method 3: If the above fails, try to extract date from the URL
      if (!date && post.link) {
        // Try to extract date from URL pattern like /YYYY/MM/title.html
        const urlDateMatch = post.link.match(/\/(\d{4})\/(\d{2})\/[^\/]+\.html/);
        if (urlDateMatch) {
          const year = urlDateMatch[1];
          const month = urlDateMatch[2];
          
          // Look for the day in the URL or filename
          let day = '01'; // Default to the 1st
          
          // Check if we can extract the day from post content
          const dayMatch = html.match(new RegExp(`(Posted|published).*${year}[^\\d]*${month}[^\\d]*(\\d{1,2})`, 'i'));
          if (dayMatch && dayMatch[2]) {
            day = dayMatch[2].padStart(2, '0');
          } else {
            // Try another pattern
            const altDayMatch = html.match(new RegExp(`${month}[/.\\-\\s]+(\\d{1,2})[/.\\-\\s]+${year}`, 'i'));
            if (altDayMatch && altDayMatch[1]) {
              day = altDayMatch[1].padStart(2, '0');
            }
          }
          
          const parsedDate = new Date(`${year}-${month}-${day}`);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
          }
        }
      }
      
      // Method 4: If all methods above fail, use today's date
      if (!date) {
        console.warn(`Could not determine publish date for post: ${post.title}, using today's date.`);
        date = new Date().toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn(`Error parsing date for post: ${post.title}, using today's date. Error: ${e.message}`);
      date = new Date().toISOString().split('T')[0];
    }

    // Create frontmatter
    const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: ${date}
original_link: ${post.link}
---

`;

    // Combine frontmatter and content
    const fullContent = frontmatter + markdown;

    // Create sanitized filename
    const filename = `${date}-${sanitize(post.title.toLowerCase().replace(/\s+/g, '-'))}.md`;

    // Save to file
    await fs.writeFile(path.join(outputDir, 'posts', filename), fullContent);

    // Process images (this is a simplified approach)
    await processImages(markdown, dom.window.document);

  } catch (error) {
    console.error(`Error processing post "${post.title}":`, error);
  }
}

async function processImages(markdown, document) {
  // Find image URLs in the markdown
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const imageUrl = match[2];
    
    try {
      // Download the image
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      
      // Generate a filename
      const filename = path.basename(imageUrl).split('?')[0]; // Remove query parameters
      const outputPath = path.join(outputDir, 'assets', 'images', filename);
      
      // Save the image
      await fs.writeFile(outputPath, Buffer.from(buffer));
      console.log(`📸 Saved image: ${filename}`);
    } catch (error) {
      console.error(`Error downloading image ${imageUrl}:`, error);
    }
  }
}

async function createReadme() {
  console.log('📄 Creating README.md...');
  
  const blogName = blogspotUrl.replace(/https?:\/\/(www\.)?/, '').replace(/\.blogspot\.com.*/, '');

  const readmeContent = `# ${blogName} Blog

This repository contains the content from my Blogspot blog, converted to a format suitable for GitHub Pages.

## Posts

The \`posts/\` directory contains all blog posts converted to Markdown format.

## Assets

Images and other media are stored in the \`assets/\` directory.

## Original Blog

This content was imported from [${blogspotUrl}](${blogspotUrl}).
`;

  await fs.writeFile(path.join(outputDir, 'README.md'), readmeContent);
}

async function createGitHubPagesConfig() {
  console.log('⚙️ Creating GitHub Pages configuration...');
  
  // Create a simple _config.yml for GitHub Pages
  const configContent = `title: My Blog
description: Imported from Blogspot
theme: jekyll-theme-minimal`;

  await fs.writeFile(path.join(outputDir, '_config.yml'), configContent);
  
  // Create a simple index.md that lists all posts using Jekyll syntax
  // We need to escape the Jekyll template syntax to avoid JavaScript template literal processing
  const indexContent = `---
layout: default
---

# Blog Posts

{% for post in site.posts %}
* [{{ post.title }}]({{ post.url }})
{% endfor %}`;

  await fs.writeFile(path.join(outputDir, 'index.md'), indexContent);
}

// Run the script
main();