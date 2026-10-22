import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type {
  VoicePackageInfo,
  VoiceItem,
  ScanVoicePackagesResult,
  LoadVoicesResult,
} from '../interfaces'

export class VoiceService {
  /**
   * Resolve root samples directory across dev server and production builds
   */
  public getSamplesDirectory(): string | null {
    const publicDir = process.env.VITE_PUBLIC || path.join(process.cwd(), 'public')
    const candidates = [
      path.join(publicDir, 'voices', 'samples'),
      path.join(process.cwd(), 'public', 'voices', 'samples'),
      path.join(app.getAppPath(), 'public', 'voices', 'samples'),
      path.join(app.getAppPath(), 'dist', 'voices', 'samples'),
    ]

    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        return dir
      }
    }
    return null
  }

  /**
   * Scan voices/samples directory, detecting all self-contained language folders
   * and reading their header file info.json
   */
  public scanVoicePackages(): ScanVoicePackagesResult {
    try {
      const samplesDir = this.getSamplesDirectory()
      if (!samplesDir) {
        console.warn('[VoiceService] Samples directory not found')
        return { success: false, packages: [], error: 'Samples folder not found' }
      }

      const entries = fs.readdirSync(samplesDir, { withFileTypes: true })
      const packages: VoicePackageInfo[] = []

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const folderPath = path.join(samplesDir, entry.name)
        const infoJsonPath = path.join(folderPath, 'info.json')
        const jsonInfoPath = path.join(folderPath, 'json.info')

        const targetInfoPath = fs.existsSync(infoJsonPath)
          ? infoJsonPath
          : fs.existsSync(jsonInfoPath)
          ? jsonInfoPath
          : null

        if (targetInfoPath) {
          try {
            const raw = fs.readFileSync(targetInfoPath, 'utf-8')
            const header = JSON.parse(raw)
            const relativeList =
              header.list ||
              header.location ||
              (fs.existsSync(path.join(folderPath, 'json', 'voices.json'))
                ? 'json/voices.json'
                : 'voices.json')

            packages.push({
              folder: entry.name,
              language: header.language || entry.name,
              name: header.name || header.language || entry.name,
              flag: header.flag || '🌐',
              code: header.code || entry.name,
              nativeName: header.nativeName || header.name || header.language,
              list: relativeList,
              location: relativeList,
              listUrl: `/voices/samples/${entry.name}/${relativeList.replace(/^\//, '')}`,
              count: header.count || 0,
            })
          } catch (err) {
            console.warn(`[VoiceService] Failed to parse info.json in ${folderPath}:`, err)
          }
        }
      }

      return { success: true, packages }
    } catch (err) {
      console.error('[VoiceService] Failed to scan voice samples:', err)
      return { success: false, packages: [], error: String(err) }
    }
  }

  /**
   * Load voices directly from disk for a given language folder
   */
  public loadVoicesForPackage(
    folder: string,
    listRelativePath = 'json/voices.json'
  ): LoadVoicesResult {
    try {
      const samplesDir = this.getSamplesDirectory()
      if (!samplesDir) {
        return { success: false, voices: [], error: 'Samples directory not found' }
      }

      const cleanList = listRelativePath.replace(/^\//, '')
      const possibleJsonPaths = [
        path.join(samplesDir, folder, cleanList),
        path.join(samplesDir, folder, 'json', 'voices.json'),
        path.join(samplesDir, folder, 'voices.json'),
      ]

      const jsonPath = possibleJsonPaths.find((p) => fs.existsSync(p))
      if (!jsonPath) {
        return { success: false, voices: [], error: `Voice list not found for folder ${folder}` }
      }

      const content = fs.readFileSync(jsonPath, 'utf-8')
      const parsed = JSON.parse(content)
      const voices: VoiceItem[] = Array.isArray(parsed) ? parsed : parsed.voices || []

      return { success: true, voices }
    } catch (err) {
      console.error(`[VoiceService] Failed to load voices for ${folder}:`, err)
      return { success: false, voices: [], error: String(err) }
    }
  }
}
