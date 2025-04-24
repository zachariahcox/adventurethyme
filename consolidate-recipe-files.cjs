#!/usr/bin/env node
// consolidate-recipe-files.js - Replace original content with formatted content and remove formatted files

const fs = require('fs');
const path = require('path');

// Path to posts directory
const postsDir = path.join(__dirname, 'adventurethyme', 'posts');
console.log(`Starting consolidation process. Looking in: ${postsDir}`);

// Check if posts directory exists
if (!fs.existsSync(postsDir)) {
  console.error(`ERROR: Posts directory not found at: ${postsDir}`);
  process.exit(1);
}

// Process all formatted markdown files and replace originals
try {
  consolidateRecipeFiles();
} catch (err) {
  console.error('Fatal error:', err);
}

function consolidateRecipeFiles() {
  console.log('Reading posts directory...');
  
  // Get all markdown files in the posts directory
  let files;
  try {
    files = fs.readdirSync(postsDir);
    console.log(`Found ${files.length} total files in directory.`);
  } catch (err) {
    console.error('Error reading posts directory:', err);
    return;
  }

  // Filter to only include formatted markdown files
  const formattedFiles = files.filter(file => 
    file.endsWith('-formatted.md')
  );

  console.log(`Found ${formattedFiles.length} formatted files to consolidate.`);
  if (formattedFiles.length === 0) {
    console.log('No files to consolidate. Exiting.');
    return;
  }

  // Counter for processing status
  let replaced = 0;
  let deleted = 0;
  let errors = 0;

  // Process each file
  formattedFiles.forEach(formattedFile => {
    // Get the original file name
    const originalFile = formattedFile.replace('-formatted.md', '.md');
    const formattedPath = path.join(postsDir, formattedFile);
    const originalPath = path.join(postsDir, originalFile);

    console.log(`\nProcessing: ${formattedFile} -> ${originalFile}`);
    
    // Check if the original file exists
    if (!fs.existsSync(originalPath)) {
      console.log(`Original file not found for: ${originalFile}. Skipping.`);
      errors++;
      return;
    }
    
    try {
      // Read formatted content
      const formattedContent = fs.readFileSync(formattedPath, 'utf8');
      
      // Replace original content with formatted content
      fs.writeFileSync(originalPath, formattedContent, 'utf8');
      console.log(`✓ Replaced content in original file: ${originalFile}`);
      replaced++;
      
      // Delete the formatted file
      fs.unlinkSync(formattedPath);
      console.log(`✓ Deleted formatted file: ${formattedFile}`);
      deleted++;
    } catch (error) {
      console.error(`Error processing ${formattedFile}:`, error);
      errors++;
    }
  });

  console.log('\nConsolidation complete.');
  console.log(`  Original files replaced: ${replaced}`);
  console.log(`  Formatted files deleted: ${deleted}`);
  console.log(`  Errors: ${errors}`);
}
