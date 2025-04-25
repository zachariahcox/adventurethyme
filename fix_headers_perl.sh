#!/usr/bin/env bash
# Fix markdown headers in recipe files by adding blank lines after headers

echo "Starting to fix headers in recipe files..."

# Navigate to the posts directory
cd /home/zacox/code/blogspot/docs/posts

# Use sed to add a blank line after any line starting with #, 
# but only if the next line isn't blank and doesn't start with #
for file in *.md; do
    # Skip if no matching files
    [ -e "$file" ] || continue
    
    # Skip special files
    if [[ "$file" == "welcome.md" || "$file" == *"ignoring-our-principles"* || "$file" == *"cooking-around-the-world"* ]]; then
        echo "Skipping special file: $file"
        continue
    fi
    
    echo "Processing: $file"
    
    # Use perl for this since it's better at multi-line pattern matching
    perl -i -pe 's/(^#+.*\n)(?!\n|#)/$1\n/gm' "$file"
    
    echo "✓ Fixed headers in: $file"
done

echo "Done fixing headers!"
