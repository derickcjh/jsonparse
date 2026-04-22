import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import type { ReactNode } from 'react'

interface SplitPanelProps {
  left: ReactNode
  right: ReactNode
}

export function SplitPanel({ left, right }: SplitPanelProps): JSX.Element {
  return (
    <Allotment defaultSizes={[50, 50]}>
      <Allotment.Pane minSize={200}>
        <div className="h-full overflow-hidden">{left}</div>
      </Allotment.Pane>
      <Allotment.Pane minSize={200}>
        <div className="h-full flex flex-col overflow-hidden">{right}</div>
      </Allotment.Pane>
    </Allotment>
  )
}
