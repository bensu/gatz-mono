# SMS Restriction Implementation - Test Scenarios

## Phase 2: Restrict SMS Signup to Legacy Users Only

### Implementation Summary

This implementation restricts SMS signup to existing SMS-only users while allowing new users to sign up via Apple/Google/email authentication methods.

### Backend Changes
1. Added `sms-signup-restricted` configuration flag in `config.edn`
2. Added SMS restriction logic in `sign-up!` function
3. Added `sms-only-user?` helper function for user identification
4. Added comprehensive test coverage

### Frontend Changes
1. Added SMS restriction error type to `types.ts`
2. Added error message handling in `sign-in.tsx`
3. Created config module for frontend restriction flags

### Manual Test Scenarios

#### Test Scenario 1: New User SMS Signup (Should Fail)
**Steps:**
1. Open app sign-in screen
2. Enter a new phone number that hasn't been used before
3. Tap "Get code"
4. Enter a valid verification code
5. Try to enter a username and sign up

**Expected Result:**
- Should receive `sms_signup_restricted` error
- Error message: "SMS signup is no longer available for new users. Please sign up with Apple, Google, or email instead."
- User should not be created

#### Test Scenario 2: Existing SMS-Only User Sign-in (Should Succeed)
**Steps:**
1. Create an SMS-only user in development environment (with `sms-signup-restricted: false`)
2. Enable SMS restriction in backend config
3. Attempt to sign in with the existing user's phone number
4. Complete SMS verification flow

**Expected Result:**
- Should successfully complete sign-in process
- User should be authenticated and redirected to main app

#### Test Scenario 3: User with Social Auth Cannot Use SMS
**Steps:**
1. Create a user with Apple or Google authentication
2. Try to use SMS login with the phone number associated with their account

**Expected Result:**
- User should be identified as non-SMS-only
- Should be directed to use their social authentication method

#### Test Scenario 4: Apple/Google Signup (Should Continue Working)
**Steps:**
1. Use Apple Sign-In or Google Sign-In button
2. Complete OAuth flow
3. Enter username if required

**Expected Result:**
- Should work normally without any SMS restrictions
- New users should be able to create accounts via social auth

#### Test Scenario 5: Email Signup (Should Continue Working)
**Steps:**
1. Use email sign-in option
2. Enter email address and verification code
3. Complete signup flow

**Expected Result:**
- Should work normally without any SMS restrictions
- New users should be able to create accounts via email auth

### Configuration Testing

#### Development Mode
- SMS restriction should be disabled (`sms-signup-restricted: false`)
- All signup methods should work

#### Production Mode
- SMS restriction should be enabled (`sms-signup-restricted: true`)
- Only social and email signup should work for new users
- Existing SMS-only users should still be able to sign in

### Database Verification Queries

To verify SMS-only users in the database:
```sql
-- Find SMS-only users (legacy users)
SELECT * FROM users WHERE 
  phone_number IS NOT NULL 
  AND apple_id IS NULL 
  AND google_id IS NULL 
  AND email IS NULL;

-- Find users with social auth
SELECT * FROM users WHERE 
  apple_id IS NOT NULL 
  OR google_id IS NOT NULL 
  OR email IS NOT NULL;
```

### Backend Test Coverage

Run backend tests:
```bash
cd server && clojure -M -e "(require 'gatz.api.user-sms-restriction-test) (clojure.test/run-tests 'gatz.api.user-sms-restriction-test)"
```

### Error Monitoring

Monitor for the following errors in production:
- `sms_signup_restricted` errors should increase after deployment
- No increase in authentication failures for existing users
- New user signups should shift to social/email methods

### Success Metrics

After deployment:
- [ ] No SMS signups from new users
- [ ] Existing SMS-only users can still authenticate
- [ ] New user acquisition continues via social/email methods
- [ ] No increase in support requests related to authentication

### Rollback Plan

If issues occur:
1. Set `sms-signup-restricted: false` in backend config
2. Redeploy backend
3. SMS signup will be re-enabled for all users

### Next Steps (Phase 3)

After Phase 2 is stable:
- Implement migration prompts for existing SMS-only users
- Force migration to social/email authentication
- Complete deprecation of SMS authentication