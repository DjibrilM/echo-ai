import { useReducer } from 'react'
import { DashboardState } from '../types'

export const initialDashboardState: DashboardState = {
  activeMedia: null,
  isPlaying: false,
  isMuted: false,
  volume: 0.85,
  prevVolume: 0.85,
  currentTime: 0,
  activeActivityTab: 'all',
  activitySearchQuery: '',
  downloadedId: null,
  copiedId: null,
}

export function useDashboardState() {
  const [state, updateState] = useReducer(
    (prev: DashboardState, next: Partial<DashboardState>) => ({ ...prev, ...next }),
    initialDashboardState
  )

  return [state, updateState] as const
}
