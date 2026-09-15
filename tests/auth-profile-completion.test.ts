import test from 'node:test'
import assert from 'node:assert/strict'
import {
  COMPLETE_PROFILE_PATH,
  completionDestination,
  destinationAfterSignIn,
  hasRequiredPhone,
} from '../src/lib/auth/profile-completion'

test('a phone number is required before an authenticated account enters the app', () => {
  assert.equal(hasRequiredPhone({ role: 'student', phone_number: '+61412345678' }), true)
  assert.equal(hasRequiredPhone({ role: 'student', phone_number: '  ' }), false)
  assert.equal(hasRequiredPhone(null), false)
})

test('incomplete profiles are sent to completion and retain a safe destination', () => {
  const profile = { role: 'student' as const, phone_number: null }
  assert.equal(destinationAfterSignIn(profile), COMPLETE_PROFILE_PATH)
  assert.equal(
    destinationAfterSignIn(profile, '/practice?exam=ucat'),
    '/complete-profile?next=%2Fpractice%3Fexam%3Ducat',
  )
  assert.equal(completionDestination('https://example.com'), COMPLETE_PROFILE_PATH)
  assert.equal(completionDestination('//example.com'), COMPLETE_PROFILE_PATH)
})

test('complete profiles continue to their requested page or role home', () => {
  assert.equal(destinationAfterSignIn({ role: 'student', phone_number: '+61412345678' }, '/practice'), '/practice')
  assert.equal(destinationAfterSignIn({ role: 'admin', phone_number: '+61412345678' }), '/admin')
  assert.equal(destinationAfterSignIn({ role: 'tutor', phone_number: '+61412345678' }), '/bookings')
})
