import test from 'node:test'
import assert from 'node:assert/strict'
import { subscriptionPeriodLabel } from '../src/lib/stripe/subscription-label'

test('only access-granting subscription states are described as renewing', () => {
  const end = '2027-09-15T00:00:00.000Z'
  assert.match(subscriptionPeriodLabel('active', end), /^Renews /)
  assert.equal(subscriptionPeriodLabel('canceled', end), 'No renewal')
  assert.equal(subscriptionPeriodLabel('incomplete', end), 'No renewal')
  assert.equal(subscriptionPeriodLabel('incomplete_expired', end), 'No renewal')
  assert.equal(subscriptionPeriodLabel('unpaid', end), 'No renewal')
})
