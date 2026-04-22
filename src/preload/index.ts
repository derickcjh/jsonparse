import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'

const electronAPI = {
  openFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN),
  saveFile: (content: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, content),
  readFile: (filePath: string): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
  newWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_NEW)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
