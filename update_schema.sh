#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting the Prisma schema update process..."

# Step 1: Change all references to `prisma/schema` to `prisma/schema.prisma` in package.json
echo "Updating package.json..."
# The `sed -i ''` command finds and replaces the text in place on both Linux and macOS.
# We use a non-default delimiter `|` to avoid issues with the forward slashes in the path.
sed -i '' 's|prisma/schema|prisma/schema.prisma|g' package.json
echo "package.json updated successfully."

# Step 2: Concatenate all fragmented .prisma files into a single schema file
echo "Concatenating schema files into a single file..."
# This command takes all files ending with .prisma in the prisma/schema directory
# and pipes their content into a new file named schema.prisma.
cat prisma/schema/*.prisma > prisma/schema.prisma
echo "Schema files concatenated successfully."

# Step 3: Remove the original fragmented schema directory
echo "Removing the old prisma/schema directory..."
# The `rm -rf` command removes the directory and its contents recursively.
rm -rf prisma/schema
echo "Old directory removed."

echo "Prisma schema update complete!"
