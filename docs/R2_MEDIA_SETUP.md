# R2 Media Setup — Categories & Future Structure

## 📂 R2 Bucket Structure (Przyszłościowy Layout)

```
il-buon-caffe-media/
├── categories/                 # Homepage category hover images
│   ├── kawa.webp              # 280×360px, Brown #8B4513
│   ├── wino.webp              # 280×360px, Burgundy #722F37
│   ├── delikatesy.webp        # 280×360px, Gold #D4AF37
│   └── akcesoria.webp         # 280×360px, Dark #2D2D2D
├── products/                   # Product images (SKU → image mapping)
│   ├── SKU-001.webp
│   └── ...
├── featured/                   # Featured products section
├── blog/                       # Blog/content images
├── cafe/                       # Cafe section (menu, ambiance)
└── assets/                     # Misc (icons, backgrounds, banners)
```

## 🚀 Setup Instructions

### Step 1: Authenticate with Cloudflare
```bash
npx wrangler login
```

### Step 2: Upload Category Images to R2

**Option A: One by one**
```bash
wrangler r2 object put il-buon-caffe-media/categories/kawa.webp --file ./path/to/kawa.webp
wrangler r2 object put il-buon-caffe-media/categories/wino.webp --file ./path/to/wino.webp
wrangler r2 object put il-buon-caffe-media/categories/delikatesy.webp --file ./path/to/delikatesy.webp
wrangler r2 object put il-buon-caffe-media/categories/akcesoria.webp --file ./path/to/akcesoria.webp
```

**Option B: Batch upload (bash/zsh)**
```bash
for file in r2-uploads/categories/*.webp; do
  basename=$(basename "$file")
  npx wrangler r2 object put il-buon-caffe-media/categories/$basename --file "$file"
done
```

### Step 3: Verify Upload
```bash
wrangler r2 object list il-buon-caffe-media/categories/
```

Should output:
```
key             etag
categories/kawa.webp
categories/wino.webp
categories/delikatesy.webp
categories/akcesoria.webp
```

## 🌐 Environment Configuration

### Development (.env.local)
```env
NEXT_PUBLIC_R2_MEDIA_URL=https://il-buon-caffe-media-dev.r2.cloudflarestorage.com
```

### Production (.env.production)
After setting up custom domain in Cloudflare R2:
```env
NEXT_PUBLIC_R2_MEDIA_URL=https://media.ilbuoncaffe.pl
```

## 🔧 Custom Domain Setup (Production)

1. Go to Cloudflare R2 Dashboard
2. Select `il-buon-caffe-media` bucket
3. **Settings** → **Custom Domains**
4. Add: `media.ilbuoncaffe.pl`
5. Verify DNS record (Cloudflare will guide you)

Then all requests to `https://media.ilbuoncaffe.pl/categories/kawa.webp` will route to R2 bucket.

## 📝 Image Specifications

| Field | Spec |
|---|---|
| Format | WebP (85% quality) |
| Dimensions | 280×360px |
| Color Space | RGB |
| Max File Size | ~50KB (optimized) |

### Recommended Tools for Creating Images

- **Online**: [TinyPNG](https://tinypng.com) + convert to WebP
- **CLI**: `sharp` (Node.js) or `ImageMagick`
- **Python**: `Pillow` (PIL)

Example with sharp:
```bash
npm install -g sharp
sharp input.png -o output.webp --format webp --quality 85
```

## 🔑 Benefits of This Setup

✅ **Zero database reads** — URLs hardcoded in frontend  
✅ **Edge caching** — Cloudflare caches all R2 content  
✅ **Scalable** — Organized folder structure for future growth  
✅ **Dev/Prod split** — Separate buckets (`-dev` suffix)  
✅ **Custom domain** — Professional CDN URL in production  

## 📋 Checklist

- [ ] Images created (280×360px WebP)
- [ ] `wrangler login` completed
- [ ] Images uploaded to `il-buon-caffe-media/categories/`
- [ ] `.env.local` updated with `NEXT_PUBLIC_R2_MEDIA_URL`
- [ ] Homepage tested (images load correctly)
- [ ] Custom domain set up (production later)
- [ ] `.env.production` ready with custom domain URL

## 🎯 Next Steps

1. **Commit this config**:
   ```bash
   git add apps/web/src/components/Home/CategoriesGrid.tsx
   git add apps/web/.env.local
   git add apps/api/wrangler.json
   git commit -m "feat(web): migrate category images to R2 media bucket"
   ```

2. **Create your images** (or use placeholders)

3. **Upload to R2** using wrangler commands above

4. **Test in dev**: `npm run dev` → Homepage → hover categories
