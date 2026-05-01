import { useQuery } from '@tanstack/react-query'
import { terminalService } from './terminal.service'

export function useTerminalSessions() {
  return useQuery({
    queryKey: ['terminals'],
    queryFn: () => terminalService.listSessions(),
    refetchInterval: 60000, // refresh every minute
  })
}
