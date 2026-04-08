#!/usr/bin/env node

/**
 * Compress images: PNG/JPG → optimized WEBP
 * Usage: node scripts/compress-images.js <input-file> [output-file]
 * 
 * Examples:
 *   node scripts/compress-images.js Kawa.png
 *   node scripts/compress-images.js r2-uploads/categories/Kawa.png r2-uploads/categories/kawa.webp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile.replace(/\.[^.]+$/, '.webp');

if (!inputFile) {
  console.log('❌ Usage: node scripts/compress-images.js <input-file> [output-file]\n');
  console.log('Examples:');
  console.log('  node scripts/compress-images.js Kawa.png');
  console.log('  node scripts/compress-images.js r2-uploads/categories/Kawa.png r2-uploads/categories/kawa.webp');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.log(`❌ File not found: ${inputFile}`);
  process.exit(1);
}

const inputStats = fs.statSync(inputFile);
const inputSizeKB = (inputStats.size / 1024).toFixed(2);

console.log(`\n🖼️  Compressing image...\n`);
console.log(`   Input:  ${inputFile} (${inputSizeKB} KB)`);
console.log(`   Output: ${outputFile}`);
console.log(`   Format: PNG/JPG → WebP (85% quality)\n`);

(async () => {
  try {
    // Read and compress
    await sharp(inputFile)
      .webp({ quality: 85 })
      .toFile(outputFile);

    const outputStats = fs.statSync(outputFile);
    const outputSizeKB = (outputStats.size / 1024).toFixed(2);
    const savings = (((inputStats.size - outputStats.size) / inputStats.size) * 100).toFixed(1);

    console.log(`✅ Done!\n`);
    console.log(`   Compressed: ${inputSizeKB} KB → ${outputSizeKB} KB`);
    console.log(`   Savings: ${savings}% 🎉\n`);
    
    console.log(`📤 Next: Upload to R2 with:\n`);
    console.log(`   wrangler r2 object put il-buon-caffe-media/categories/kawa.webp --file ${outputFile}\n`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
})();
