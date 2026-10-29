/**
 * Formats duration values into standard music format (m:ss, e.g. "1:00", "0:30", "3:42").
 * Supports raw numbers (seconds), duration strings like "1m 0s", "30s", "3m 42s", or existing "mm:ss".
 */
export function formatDuration(duration: number | string | undefined | null): string {
  if (duration === undefined || duration === null || duration === '') {
    return '0:00'
  }

  // If already number of seconds
  if (typeof duration === 'number') {
    if (!Number.isFinite(duration) || duration < 0) return '0:00'
    const totalSec = Math.round(duration)
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const str = String(duration).trim()

  // If already in m:ss or mm:ss format (e.g. "1:00", "0:30", "03:42")
  if (/^\d+:\d{2}$/.test(str)) {
    const [m, s] = str.split(':')
    return `${parseInt(m, 10)}:${s}`
  }

  // Parse strings like "1m 0s", "1m 30s", "30s", "3m 42s", "2m", "180s"
  let totalSec = 0
  const mMatch = str.match(/(\d+)\s*m/i)
  const sMatch = str.match(/(\d+)\s*s/i)

  if (mMatch || sMatch) {
    if (mMatch) totalSec += parseInt(mMatch[1], 10) * 60
    if (sMatch) totalSec += parseInt(sMatch[1], 10)
  } else {
    const num = parseFloat(str)
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      totalSec = Math.round(num)
    }
  }

  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
