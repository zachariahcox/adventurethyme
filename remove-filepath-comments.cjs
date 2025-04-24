#!/usr/bin/env node
// remove-filepath-comments.cjs - Remove filepath HTML comments from the top of recipe files

const fs = require('fs');
const path = require('path');

// Path to posts directory
const postsDir = path.join(__dirname, 'adventurethyme', 'posts');
console.log(`Starting comment removal process. Looking in: ${postsDir}`);

// Check if posts directory exists
if (!fs.existsSync(postsDir)) {
  console.error(`ERROR: Posts directory not found at: ${postsDir}`);
  process.exit(1);
}

// Process all markdown files in the directory
try {
  removeFilePathComments();
} catch (err) {
  console.error('Fatal error:', err);
}

function removeFilePathComments() {
  console.log('Reading posts directory...');
  
  // Get all markdown files in the posts directory
  let files;
  try {
    files = fs.readdirSync(postsDir).filter(file => 
      file.endsWith('.md') && 
      !file.includes('welcome') && 
      !file.includes('ignoring-our-principles') && 
      !file.includes('cooking-around-the-world')
    );
    console.log(`Found ${files.length} recipe files to process.`);
  } catch (err) {
    console.error('Error reading posts directory:', err);
    return;
  }

  // Counter for processing status
  let processed = 0;
  let modified = 0;
  let errors = 0;

  // Process each file
  files.forEach(file => {
    const filePath = path.join(postsDir, file);
    console.log(`Processing: ${file}`);
    
    try {
      // Read file content
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Remove filepath HTML comments at the beginning of the file
      content = content.replace(/^(<!--\s*filepath:[^>]*-->\s*)+/m, '');
      
      // If content changed, write it back
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Removed filepath comments from: ${file}`);
        modified++;
      } else {
        console.log(`- No filepath comments found in: ${file}`);
      }
      
      processed++;
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
      errors++;
    }
  });

  console.log('\nComment removal complete.');
  console.log(`  Files processed: ${processed}`);
  console.log(`  Files modified: ${modified}`);
  console.log(`  Errors: ${errors}`);
}
