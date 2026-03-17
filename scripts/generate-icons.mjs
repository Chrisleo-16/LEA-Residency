import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Creates a simple colored square icon with "LEA" text
// Replace this with your actual logo SVG
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#000000"/>
  <text
    x="256" y="290"
    font-family="Arial, sans-serif"
    font-size="160"
    font-weight="bold"
    fill="white"
    text-anchor="middle"
  >LEA</text>
</svg>
`

for (const size of sizes) {
  await sharp(Buffer.from(svgIcon))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`)
  console.log(`✅ Generated icon-${size}x${size}.png`)
}

console.log('🎉 All icons generated!')