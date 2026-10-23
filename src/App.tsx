import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { IpcProvider } from '@/components/providers/IpcProvider'
function App() {
  return (
    <IpcProvider>
      <RouterProvider router={router} />
    </IpcProvider>
  )
}

export default App
