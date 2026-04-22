interface ElectronAPI {
  openFile: () => Promise<{ path: string; content: string } | null>
  saveFile: (content: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<{ path: string; content: string } | null>
  newWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
