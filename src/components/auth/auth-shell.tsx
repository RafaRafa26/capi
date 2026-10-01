// Centered single-column frame shared by the screens outside an
// organization: login, sign-up, company picker, new company, invitation.
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
