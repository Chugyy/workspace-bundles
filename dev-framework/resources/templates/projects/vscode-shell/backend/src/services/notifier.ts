import { config } from '../config.js'

class Notifier {
  private get enabled(): boolean {
    return !!config.telegram?.botToken && !!config.telegram?.chatId
  }

  async send(message: string): Promise<void> {
    if (!this.enabled) return
    try {
      await fetch(`https://api.telegram.org/bot${config.telegram!.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram!.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      })
    } catch (err) {
      console.error('[Notifier] Failed to send Telegram message:', err)
    }
  }

  async sendWarning(terminalName: string, remainingMin: number): Promise<void> {
    await this.send(`⚠️ *Terminal "${terminalName}"* expires in ${remainingMin} minutes.`)
  }

  async sendExpired(terminalName: string): Promise<void> {
    await this.send(`🔴 *Terminal "${terminalName}"* has expired and was killed.`)
  }
}

export const notifier = new Notifier()
