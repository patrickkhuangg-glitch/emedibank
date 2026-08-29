'use client'
import { openBillingPortalAction } from '@/lib/stripe/actions'
import { Button } from '@/components/ui/button'

export function BillingButton() {
  return (
    <form action={openBillingPortalAction}>
      <Button type="submit" variant="secondary">Manage billing</Button>
    </form>
  )
}
