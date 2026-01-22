import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'

export default function SettingsPage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email updates about your events</p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Gmail Integration</p>
                <p className="text-sm text-muted-foreground">Manage your connected Gmail account</p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation</CardTitle>
            <CardDescription>Configure automation settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Follow-up Timing</p>
                <p className="text-sm text-muted-foreground">Set how long to wait before follow-ups</p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Decision Thresholds</p>
                <p className="text-sm text-muted-foreground">Configure auto-decision rules</p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-destructive/80">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
