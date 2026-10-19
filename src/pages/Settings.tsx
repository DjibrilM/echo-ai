import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Shield, User } from 'lucide-react'

export function Settings() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account credentials, workspace preferences, and API integrations.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Key className="size-5 text-primary" />
            <h2 className="text-base font-semibold">ElevenLabs API Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Provide your ElevenLabs API key or authenticate via the CLI (`pnpm dlx @elevenlabs/cli@latest auth login`).
          </p>
          <div className="flex gap-2 max-w-md">
            <Input type="password" placeholder="xi-..." />
            <Button size="sm">Save</Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <h2 className="text-base font-semibold">User Profile</h2>
          </div>
          <div className="grid gap-3 max-w-md">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Display Name</label>
              <Input defaultValue="shadcn" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input defaultValue="m@example.com" />
            </div>
          </div>
        </Card>

        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Desktop Security & IPC</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Electron context isolation and nodeIntegration parameters are securely enforced.
          </p>
        </Card>
      </div>
    </div>
  )
}
