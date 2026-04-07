interface ElectronAPI {
  openFile: () => Promise<{ path: string; content: string } | null>
  saveFile: (content: string) => Promise<boolean>
  newWindow: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
