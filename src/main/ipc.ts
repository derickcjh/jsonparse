import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { IPC_CHANNELS } from '../shared/constants'
import { createWindow } from './window'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'Text Files', extensions: ['txt'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const content = await readFile(result.filePaths[0], 'utf-8')
    return { path: result.filePaths[0], content }
  })

  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return { path: filePath, content }
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILE_SAVE, async (event, content: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false
    await writeFile(result.filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_NEW, () => {
    createWindow()
  })
}
