import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SAMPLES_DIR = path.resolve(__dirname, '../public/voices/samples')
const DATA_DIR = path.resolve(__dirname, '../src/data')

if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true })
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const LANGUAGES_MAP = [
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', wikiCode: 'swa' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', wikiCode: 'spa' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', wikiCode: 'fra' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', wikiCode: 'deu' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', wikiCode: 'ita' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', wikiCode: 'por' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', wikiCode: 'jpn' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳', wikiCode: 'cmn' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', wikiCode: 'kor' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', wikiCode: 'hin' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', wikiCode: 'ara' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', wikiCode: 'rus' },
]

const COLORS = [
  '#38bdf8', '#ec4899', '#f59e0b', '#06b6d4', '#d97706',
  '#8b5cf6', '#10b981', '#ef4444', '#a855f7', '#3b82f6',
  '#6366f1', '#84cc16', '#14b8a6', '#c084fc', '#0ea5e9'
]

const AVATARS = [
  '/voices/sterling.jpg',
  '/voices/serena.jpg',
  '/voices/chloe.jpg',
  '/voices/jax.jpg',
  '/voices/alistair.jpg',
  '/voices/dorian.jpg',
  '/voices/rowan.jpg',
  '/voices/kaelen.jpg',
  '/voices/leo.jpg',
  '/voices/eleanor.jpg',
  '/voices/helena.jpg',
  '/voices/milo.jpg',
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'EchoMultilingualAudioDownloader/1.0 (contact@echo-ai.org)',
      Accept: 'application/json',
    },
  })
  if (res.status === 429) {
    console.log('    API Rate limited (429), waiting 5s...')
    await sleep(5000)
    return fetchJson(url)
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

async function downloadFile(fileUrl, destPath, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'EchoMultilingualAudioDownloader/1.0 (contact@echo-ai.org)',
        },
      })
      if (res.status === 429) {
        const waitTime = attempt * 3500
        console.log(`    Download rate limited (429), sleeping ${waitTime / 1000}s (attempt ${attempt}/${retries})...`)
        await sleep(waitTime)
        continue
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const buffer = await res.arrayBuffer()
      fs.writeFileSync(destPath, Buffer.from(buffer))
      return
    } catch (err) {
      if (attempt === retries) throw err
      await sleep(attempt * 2000)
    }
  }
}

async function processLanguage(lang) {
  console.log(`\n========================================`)
  console.log(`Processing ${lang.name} (${lang.code} / ${lang.wikiCode})...`)

  // Fetch category members
  const catUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Lingua_Libre_pronunciation-${lang.wikiCode}&cmlimit=100&format=json`
  const catData = await fetchJson(catUrl)
  const members = (catData.query?.categorymembers || []).filter(
    (m) => m.title.endsWith('.wav') || m.title.endsWith('.ogg') || m.title.endsWith('.mp3')
  )

  if (members.length === 0) {
    console.warn(`No audio members found for ${lang.name}`)
    return []
  }

  // Filter meaningful words (skipping single punctuation like $, %, &)
  const candidates = []
  for (const m of members) {
    const rawTitle = m.title.replace(/^File:/, '')
    const match = rawTitle.match(/LL-Q\d+\s*\([^)]+\)-([^-]+)-(.+)\.(wav|ogg|mp3)$/i)
    let speaker = 'Native Speaker'
    let phrase = rawTitle

    if (match) {
      speaker = match[1].trim()
      phrase = match[2].trim().replace(/\(.*?\)/g, '').trim()
    }

    // Skip punctuation and single characters
    if (/^[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+$/.test(phrase)) {
      continue
    }
    if (phrase.length < 2) continue

    candidates.push({
      title: m.title,
      rawTitle,
      speaker: speaker || `Speaker ${candidates.length + 1}`,
      phrase: phrase || 'Utterance',
      ext: path.extname(m.title) || '.wav',
    })

    if (candidates.length >= 10) break
  }

  // Batch resolve image URLs
  const titlesParam = candidates.map((c) => encodeURIComponent(c.title)).join('|')
  const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url&format=json`
  await sleep(1000)
  const infoData = await fetchJson(infoUrl)

  const urlMap = new Map()
  for (const page of Object.values(infoData.query?.pages || {})) {
    if (page.imageinfo?.[0]?.url) {
      urlMap.set(page.title, page.imageinfo[0].url)
    }
  }

  // Download files and construct voice objects
  const voices = []
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const fileUrl = urlMap.get(c.title)
    if (!fileUrl) continue

    const filename = `voice_${lang.code}_${i + 1}${c.ext}`
    const destPath = path.join(SAMPLES_DIR, filename)

    try {
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 2000) {
        console.log(`  [${i + 1}/10] (Cached) ${c.speaker} ("${c.phrase}") -> ${filename}`)
      } else {
        console.log(`  [${i + 1}/10] Downloading ${c.speaker} ("${c.phrase}") -> ${filename}`)
        await sleep(1200)
        await downloadFile(fileUrl, destPath)
      }

      voices.push({
        id: `voice-${lang.code}-${i + 1}`,
        name: `${c.speaker} (${lang.name})`,
        speakerName: c.speaker,
        phrase: c.phrase,
        description: `Native ${lang.name} voice — sample: "${c.phrase}"`,
        category: 'preset',
        color: COLORS[i % COLORS.length],
        avatarUrl: AVATARS[i % AVATARS.length],
        sampleUrl: `/voices/samples/${filename}`,
        initials: getInitials(c.speaker),
        gender: i % 2 === 0 ? 'Female' : 'Male',
        languageCode: lang.code,
        languageName: lang.name,
        tags: [lang.name, 'Native Speaker', 'Authentic'],
      })
    } catch (err) {
      console.error(`  Error downloading ${c.title}:`, err.message)
    }
  }

  return voices
}

async function main() {
  console.log(`Starting download of 10 voices per language...`)
  const allVoices = {}

  for (const lang of LANGUAGES_MAP) {
    try {
      const voices = await processLanguage(lang)
      allVoices[lang.code] = voices
      await sleep(1500)
    } catch (err) {
      console.error(`Failed to process language ${lang.name}:`, err.message)
    }
  }

  const outputPath = path.join(DATA_DIR, 'multilingual-voices.json')
  fs.writeFileSync(outputPath, JSON.stringify(allVoices, null, 2), 'utf-8')
  console.log(`\n========================================`)
  console.log(`Successfully wrote multilingual voices to ${outputPath}`)

  const total = Object.values(allVoices).reduce((acc, list) => acc + list.length, 0)
  console.log(`Total multilingual voices downloaded and registered: ${total}`)
}

main().catch((err) => {
  console.error('Fatal error in downloader:', err)
  process.exit(1)
})
