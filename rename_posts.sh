#!/usr/bin/env bash
# Script to reorganize posts folder by removing date information from filenames

# Navigate to the posts directory
cd /home/zacox/code/blogspot/docs/posts

# Create a mapping file to track old and new names
echo "Creating file mapping for reference..."
rm -f ../file_mapping.txt 2>/dev/null
touch ../file_mapping.txt

# Loop through all markdown files with date prefixes
for file in [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-*.md; do
    # Skip if no matching files
    [ -e "$file" ] || continue
    
    # Extract the part of the filename after the date prefix
    new_name="${file:11}"
    
    # Skip special files we don't want to rename
    if [[ "$file" == *"welcome.md" || "$file" == *"ignoring-our-principles"* || "$file" == *"cooking-around-the-world"* ]]; then
        echo "Skipping special file: $file"
        continue
    fi
    
    echo "Renaming: $file → $new_name"
    
    # Record the mapping
    echo "$file → $new_name" >> ../file_mapping.txt
    
    # Rename the file
    mv "$file" "$new_name"
done

echo "File renaming complete. See file_mapping.txt for reference."
echo "You may need to update internal links and references."
