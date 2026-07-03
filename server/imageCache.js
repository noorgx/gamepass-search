const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

let _cacheDir = null

function init(cacheDir) {
  _cacheDir = cacheDir
  fs.mkdirSync(cacheDir, { recursive: true })
}

function getCacheDir() {
  if (!_cacheDir) throw new Error('imageCache not initialized')
  return _cacheDir
}

// Stable filename from URL + dimensions
function cacheKey(url, w, h) {
  const hash = crypto.createHash('sha1').update(`${url}|${w}|${h}`).digest('hex')
  return hash + '.jpg'
}

// Append Microsoft CDN size params to a store-images URL
function sizedUrl(url, w, h) {
  if (!url) return null
  // Don't add params to non-Microsoft URLs
  if (!url.includes('store-images') && !url.includes('microsoft.com')) return url
  const base = url.split('?')[0]
  return `${base}?w=${w}&h=${h}&format=jpg&q=80`
}

async function serve(url, w, h, res) {
  const cacheDir = getCacheDir()
  const filename = cacheKey(url, w, h)
  const filePath = path.join(cacheDir, filename)

  // Cache hit
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=604800') // 7 days
    return fs.createReadStream(filePath).pipe(res)
  }

  // Cache miss — fetch from CDN
  const fetchUrl = sizedUrl(url, w, h)
  if (!fetchUrl) return res.status(404).end()

  try {
    const response = await fetch(fetchUrl)
    if (!response.ok) return res.status(response.status).end()

    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=604800')
    res.end(buffer)
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch image' })
  }
}

module.exports = { init, serve }
