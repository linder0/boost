import { getUserProfile } from '@/app/actions/profile'
import { PAGE_CONTAINER_CLASS } from '@/lib/utils'
import { ProfileEditor } from './profile-editor'
import { CopyPrompt } from './copy-prompt'

export default async function ProfilePage() {
  const profile = await getUserProfile()

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Personal Info</h1>
        <p className="text-muted-foreground mt-1">
          Tell the AI about yourself and your preferences. This context will be used when generating outreach messages.
        </p>
      </div>

      <CopyPrompt />

      <ProfileEditor initialContext={profile?.context || ''} />
    </div>
  )
}
