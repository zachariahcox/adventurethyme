#!/usr/bin/env bash
# Script to add a blank line after headers in all recipe files

# Navigate to the posts directory
cd /home/zacox/code/blogspot/docs/posts

# Counter for modified files
modified=0

# Loop through all markdown files
for file in *.md; do
    # Skip if no matching files
    [ -e "$file" ] || continue
    
    # Skip special files we don't want to modify
    if [[ "$file" == *"welcome.md" || "$file" == *"ignoring-our-principles"* || "$file" == *"cooking-around-the-world"* ]]; then
        echo "Skipping special file: $file"
        continue
    fi
    
    echo "Processing: $file"
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Process the file line by line
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Write the current line to the temp file
        echo "$line" >> "$temp_file"
        
        # If line starts with one or more # (header), add a blank line after it
        # But only if the next line is not already blank and doesn't start with #
        if [[ "$line" =~ ^#+ ]]; then
            # Read the next line without advancing the file pointer
            next_line=$(head -n 1)
            
            # If next line is not empty and doesn't start with #, add a blank line
            if [[ -n "$next_line" && ! "$next_line" =~ ^#+ && ! "$next_line" =~ ^$ ]]; then
                echo "" >> "$temp_file"
            fi
            
            # Put the next line back into stdin for the next iteration
            echo "$next_line"
        fi
    done < "$file"
    
    # Check if the file was modified
    if ! cmp -s "$temp_file" "$file"; then
        mv "$temp_file" "$file"
        echo "✓ Fixed headers in: $file"
        ((modified++))
    else
        rm "$temp_file"
        echo "- No changes needed for: $file"
    fi
done

echo "Header fixing complete. Modified $modified files."
