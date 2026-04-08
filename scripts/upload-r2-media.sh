#!/bin/bash

# R2 Media Uploader — Upload placeholder category images
# Usage: bash scripts/upload-r2-media.sh [bucket-name]

set -e

BUCKET_NAME="${1:-il-buon-caffe-media}"
UPLOAD_DIR="r2-uploads/categories"

echo "📦 Uploading images to R2 bucket: $BUCKET_NAME"
echo "📁 Source directory: $UPLOAD_DIR"
echo ""

if [ ! -d "$UPLOAD_DIR" ]; then
  echo "❌ Directory not found: $UPLOAD_DIR"
  echo "Please create placeholder images first."
  exit 1
fi

# Check if wrangler is available
if ! command -v wrangler &> /dev/null && ! command -v npx &> /dev/null; then
  echo "❌ wrangler CLI not found. Install with: npm install -g wrangler"
  exit 1
fi

# Upload each image
for file in "$UPLOAD_DIR"/*.webp; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "⬆️  Uploading: $filename"
    npx wrangler r2 object put "$BUCKET_NAME/categories/$filename" --file "$file"
    echo "✅ $filename uploaded"
  fi
done

echo ""
echo "✅ All images uploaded to $BUCKET_NAME/categories/"
echo ""
echo "📝 Verify with:"
echo "   wrangler r2 object list $BUCKET_NAME/categories/"
