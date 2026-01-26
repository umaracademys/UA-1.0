# Mushaf Page Images

This directory should contain all 604 pages of the Mushaf (Quran) as PNG images.

## Required Files

Place images named as:
- `page-001.png` (Page 1)
- `page-002.png` (Page 2)
- ...
- `page-604.png` (Page 604)

## Image Requirements

- **Format**: PNG (recommended) or JPG
- **Quality**: High resolution (at least 1200px width recommended)
- **Consistency**: All images should have the same dimensions and formatting
- **Source**: Use QPC (Quran.com) mushaf images or similar high-quality source

## How to Obtain Images

### Option 1: Download from Quran.com
1. Visit https://quran.com
2. Navigate to the Mushaf view
3. Download each page (you may need to use a script or tool to download all 604 pages)

### Option 2: Use QPC API
The QPC (Quran.com) API provides page images:
- Base URL: `https://api.quran.com/api/v4/quran/verses/uthmani`
- You can use their CDN for page images

### Option 3: Purchase/Download from Authorized Sources
- Ensure you have proper licensing for commercial use
- Many Islamic organizations provide Mushaf images for educational purposes

## Quick Setup Script

If you have access to a script or tool that can download images, you can use:

```bash
# Example: Download from a CDN (adjust URL as needed)
for i in {1..604}; do
  page=$(printf "%03d" $i)
  curl -o "page-${page}.png" "https://cdn.example.com/mushaf/page-${page}.png"
done
```

## Notes

- The images are served statically from the `public` folder
- Make sure all 604 images are present for the full Mushaf experience
- Images should be optimized for web (compressed but high quality)
