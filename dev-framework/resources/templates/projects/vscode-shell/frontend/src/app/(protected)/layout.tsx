import { WorkspaceProvider } from '@/contexts/workspace-context'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>
}
