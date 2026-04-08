#!/usr/bin/env node

/**
 * Generate placeholder category images for R2
 * These are temporary — replace with real images later
 * 
 * Usage: node scripts/generate-placeholder-images.js
 */

const fs = require('fs');
const path = require('path');

// For Windows compatibility, use a simple approach with solid colors
const categories = [
  {
    name: 'kawa.webp',
    color: '#8B4513',
    label: 'KAWA',
    description: 'placeholder for coffee category'
  },
  {
    name: 'wino.webp',
    color: '#722F37',
    label: 'WINA',
    description: 'placeholder for wine category'
  },
  {
    name: 'delikatesy.webp',
    color: '#D4AF37',
    label: 'DELIKATESY',
    description: 'placeholder for delicacies category'
  },
  {
    name: 'akcesoria.webp',
    color: '#2D2D2D',
    label: 'AKCESORIA',
    description: 'placeholder for accessories category'
  }
];

const uploadDir = path.join(__dirname, '..', 'r2-uploads', 'categories');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✓ Created directory: ${uploadDir}`);
}

console.log(`\n📸 Generating placeholder images for R2 media bucket\n`);
console.log(`   Directory: ${uploadDir}`);
console.log(`   Format: WebP (280×360px)\n`);

// Try to use sharp if available, otherwise create minimal WebP files
try {
  const sharp = require('sharp');
  
  (async () => {
    for (const cat of categories) {
      const filePath = path.join(uploadDir, cat.name);
      
      // Create SVG buffer
      const svg = `<svg width="280" height="360" xmlns="http://www.w3.org/2000/svg">
        <rect width="280" height="360" fill="${cat.color}"/>
        <text x="140" y="180" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="${cat.color === '#D4AF37' ? '#000' : '#fff'}" dominant-baseline="middle">${cat.label}</text>
      </svg>`;
      
      await sharp(Buffer.from(svg))
        .webp({ quality: 85 })
        .toFile(filePath);
      
      const stats = fs.statSync(filePath);
      console.log(`✓ ${cat.name} (${(stats.size / 1024).toFixed(1)} KB) — ${cat.description}`);
    }
    
    console.log(`\n✅ All placeholder images generated!\n`);
    console.log(`📤 Next step: Upload to R2 with:\n`);
    console.log(`   bash scripts/upload-r2-media.sh il-buon-caffe-media-dev\n`);
  })();
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.log(`❌ sharp not found. Install with:\n`);
    console.log(`   npm install sharp --save-dev\n`);
    process.exit(1);
  }
  throw err;
}
