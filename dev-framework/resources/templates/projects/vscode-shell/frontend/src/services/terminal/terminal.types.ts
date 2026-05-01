export interface TerminalMessage {
  type: 'data' | 'resize'
  data?: string
  cols?: number
  rows?: number
}
