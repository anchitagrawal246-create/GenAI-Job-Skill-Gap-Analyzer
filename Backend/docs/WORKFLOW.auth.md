# AI Interview Backend — Complete Workflow

## 1. Project Overview

**Project:** AI Interview

**Backend:** Node.js + Express.js

**Database:** MongoDB + Mongoose

**Cache / Session Store:** Redis

**Authentication:** JWT Access Token + Refresh Token + Redis Session

**Email:** Nodemailer + Google OAuth2

---

# 2. Global Backend Request Flow

Every API request follows this general flow:

```text
Client
   │
   ▼
Express / app.js
   │
   ▼
Main Router
   │
   ▼
Feature Router
   │
   ▼
Middleware
   │
   ▼
Controller
   │
   ▼
Service
   │
   ├──────────────┬──────────────┬──────────────┐
   ▼              ▼              ▼              ▼
MongoDB         Redis          Email         Utilities
   │              │              │
   ▼              ▼              ▼
UserModel      Session/OTP    Gmail OAuth2
   │
   ▼
Controller
   │
   ▼
Response
   │
   ▼
Client
```

---

# 3. Application Startup Workflow

```text
server.js
    │
    ▼
Load environment variables
    │
    ▼
Import src/app.js
    │
    ▼
Create Express application
    │
    ├── JSON parser
    ├── Cookie parser
    ├── CORS
    └── Routes
            │
            ▼
       /api/auth
            │
            ▼
     Start HTTP server
```

Main files:

```text
server.js
src/app.js
src/config/database.js
src/config/redis.js
```

---

# 4. Database Connection Workflow

```text
Application
    │
    ▼
src/config/database.js
    │
    ▼
Mongoose
    │
    ▼
MongoDB
```

MongoDB stores permanent application data.

Primary user data:

```text
_id
username
email
password
isEmailVerified
role
createdAt
updatedAt
```

---

# 5. Redis Connection Workflow

```text
Application
    │
    ▼
src/config/redis.js
    │
    ▼
Redis Client
    │
    ▼
Redis Server
```

Redis handles temporary or session-related information:

```text
Sessions
Refresh tokens
OTP data
OTP expiration
OTP cooldown
Recovery data
Reset tokens
Session revocation
Token/session state
```

---

# 6. Registration Workflow

## Route

```text
POST /api/auth/register
```

## Flow

```text
Client
   │
   ▼
register.routes.js
   │
   ▼
RegisterUserController
   │
   ├── Validate username
   ├── Validate email
   ├── Validate password
   ├── Check username
   ├── Check email
   ├── Hash password
   ├── Generate OTP
   └── Store temporary registration data
   │
   ▼
registration.service.js
   │
   ▼
Redis
   │
   ▼
otp-email.service.js
   │
   ▼
email.service.js
   │
   ▼
email.oauth.js
   │
   ▼
Google OAuth2
   │
   ▼
Nodemailer
   │
   ▼
Gmail
   │
   ▼
User receives OTP
```

The user is **not fully registered/activated** until OTP verification succeeds.

---

# 7. Username Availability Workflow

## Route

```text
GET /api/auth/check-username?username=anchit
```

## Flow

```text
Client
   │
   ▼
register.routes.js
   │
   ▼
CheckUsernameController
   │
   ▼
UserModel
   │
   ▼
MongoDB
   │
   ▼
Check username
   │
   ├── Exists
   │     └── unavailable
   │
   └── Does not exist
         └── available
```

---

# 8. Email Availability Workflow

## Route

```text
GET /api/auth/check-email?email=test@gmail.com
```

## Flow

```text
Client
   │
   ▼
CheckEmailController
   │
   ├── Normalize email
   ├── Validate email format
   │
   ▼
isEmailDomainValid()
   │
   ▼
DNS MX lookup
   │
   ├── MX exists
   │      └── Domain valid
   │
   └── MX missing
          └── Domain invalid
   │
   ▼
UserModel
   │
   ▼
MongoDB
   │
   ▼
Return availability
```

Example:

```json
{
  "valid": true,
  "exists": false,
  "available": true
}
```

DNS validation only proves that the domain can receive email. It does not prove that the specific mailbox exists.

Actual email ownership is verified through OTP.

---

# 9. Registration OTP Verification

## Route

```text
POST /api/auth/verify-registration
```

## Flow

```text
Client
   │
   ▼
VerifyRegistrationController
   │
   ▼
registration.service.js
   │
   ▼
Redis
   │
   ├── Get registration data
   ├── Get stored OTP
   ├── Check expiration
   └── Compare OTP
   │
   ▼
OTP correct
   │
   ▼
Create user
   │
   ▼
UserModel
   │
   ▼
MongoDB
   │
   ▼
isEmailVerified = true
   │
   ▼
Delete temporary registration data
   │
   ▼
Registration completed
```

If the OTP is invalid or expired:

```text
Redis
   │
   ▼
Verification fails
   │
   ▼
400 / appropriate error
```

---

# 10. Login Workflow

## Route

```text
POST /api/auth/login
```

## Flow

```text
Client
   │
   ▼
login.routes.js
   │
   ▼
LoginUserController
   │
   ├── Validate email
   └── Normalize email
   │
   ▼
UserModel
   │
   ▼
MongoDB
   │
   ▼
Find user
   │
   ├── User not found
   │      └── Login failed
   │
   ▼
bcrypt.compare()
   │
   ├── Wrong password
   │      └── Login failed
   │
   ▼
Check isEmailVerified
   │
   ├── false
   │      └── Verification required
   │
   ▼
createSession()
   │
   ▼
Redis
   │
   ▼
Generate refresh token
   │
   ▼
generateToken()
   │
   ▼
JWT Access Token
   │
   ▼
setAuthCookies()
   │
   ├── accessToken
   ├── refreshToken
   └── sessionId
   │
   ▼
Login successful
```

---

# 11. Session Creation Workflow

Session creation connects the user's authentication state to Redis.

```text
LoginUserController
       │
       ▼
createSession()
       │
       ▼
Generate sessionId
       │
       ▼
Generate refresh token
       │
       ▼
Store session in Redis
       │
       ▼
Redis
```

Conceptually the Redis session contains:

```text
sessionId
userId
refreshToken information
session status
expiration
other session metadata
```

---

# 12. JWT Access Token Workflow

File:

```text
src/utils/jwt.utils.js
```

Function:

```text
generateToken(user, sessionId)
```

Flow:

```text
User
 │
 ▼
generateToken(user, sessionId)
 │
 ▼
Generate unique JTI
 │
 ▼
Create JWT payload
```

Payload:

```json
{
  "id": "userId",
  "username": "username",
  "sessionId": "sessionId",
  "jti": "unique-jti"
}
```

Then:

```text
JWT payload
   │
   ▼
Sign with JWT_SECRET_KEY
   │
   ▼
Short-lived Access Token
```

Example:

```text
ACCESS_TOKEN_EXPIRES_IN=15m
```

---

# 13. Authentication Cookie Workflow

File:

```text
src/utils/cookie.utils.js
```

Authentication creates three cookies:

```text
accessToken
    │
    └── Short-lived JWT

refreshToken
    │
    └── Long-lived session token

sessionId
    │
    └── Identifies Redis session
```

Flow:

```text
Authentication
     │
     ▼
setAuthCookies()
     │
     ├── accessToken
     ├── refreshToken
     └── sessionId
```

---

# 14. Protected API Workflow

```text
Client
   │
   │ accessToken cookie
   ▼
Protected Route
   │
   ▼
auth.middleware.js
   │
   ├── Read accessToken
   ├── Verify JWT signature
   ├── Verify issuer
   ├── Verify audience
   ├── Check expiration
   ├── Validate id
   ├── Validate sessionId
   └── Validate jti
   │
   ▼
verifyAccessSession(sessionId)
   │
   ▼
Redis
   │
   ├── Session exists
   └── Session valid
   │
   ▼
Compare:
JWT.id === Redis session.userId
   │
   ▼
req.user
req.session
   │
   ▼
Controller
```

If validation fails:

```text
401 Unauthorized
```

---

# 15. Access Token Expiration Workflow

Access tokens are intentionally short-lived.

Example:

```text
Access Token
     │
     ▼
15 minutes
     │
     ▼
Expired
     │
     ▼
Protected API request
     │
     ▼
auth.middleware.js
     │
     ▼
TokenExpiredError
     │
     ▼
401
```

Response:

```json
{
  "success": false,
  "message": "Access token expired",
  "code": "ACCESS_TOKEN_EXPIRED"
}
```

The frontend should then call:

```text
POST /api/auth/refresh
```

---

# 16. Refresh Token Workflow

## Route

```text
POST /api/auth/refresh
```

## Flow

```text
Client
   │
   ▼
refresh.routes.js
   │
   ▼
RefreshAuthController
   │
   ├── Read refreshToken cookie
   └── Read sessionId
   │
   ▼
Redis session
   │
   ├── Session exists?
   ├── Refresh token valid?
   └── Session revoked?
   │
   ▼
Generate new access token
   │
   ▼
generateToken(user, sessionId)
   │
   ▼
setAuthCookies()
   │
   ▼
New accessToken
```

The refresh flow does not require the user to log in again while the valid refresh session remains active.

---

# 17. Logout Workflow

## Route

```text
POST /api/auth/logout
```

## Flow

```text
Client
   │
   ▼
session.routes.js
   │
   ▼
auth.middleware.js
   │
   ├── Read accessToken
   ├── Verify JWT
   ├── Extract sessionId
   ├── Verify Redis session
   └── Validate user
   │
   ▼
Logout Controller
   │
   ▼
Revoke/Delete Redis session
   │
   ▼
Clear authentication cookies
   │
   ├── accessToken
   ├── refreshToken
   └── sessionId
   │
   ▼
Logout successful
```

---

# 18. Forgot Password Workflow

## Route

```text
POST /api/auth/forgot-password
```

## Flow

```text
Client
   │
   ▼
ForgotPasswordController
   │
   ▼
Find user
   │
   ▼
MongoDB
   │
   ▼
Generate OTP
   │
   ▼
Store OTP
   │
   ▼
Redis
   │
   ▼
otp-email.service.js
   │
   ▼
Email Service
   │
   ▼
Google OAuth2
   │
   ▼
Gmail
   │
   ▼
User receives OTP
```

---

# 19. Password OTP Verification

## Route

```text
POST /api/auth/verify-password-otp
```

## Flow

```text
Client
   │
   ▼
VerifyPasswordOTPController
   │
   ▼
Redis
   │
   ├── Find OTP
   ├── Check expiration
   ├── Compare OTP
   └── Delete/invalidate OTP
   │
   ▼
OTP verified
   │
   ▼
Generate reset token
   │
   ▼
Store reset token in Redis
```

The reset token is separate from the normal login access token.

---

# 20. Reset Password Workflow

## Route

```text
POST /api/auth/reset-password
```

## Flow

```text
Client
   │
   ▼
ResetPasswordController
   │
   ▼
Validate reset token
   │
   ▼
Redis
   │
   ▼
Find user
   │
   ▼
bcrypt.hash()
   │
   ▼
Update password
   │
   ▼
MongoDB
   │
   ▼
Invalidate reset token
   │
   ▼
Password reset completed
```

---

# 21. Password OTP Resend Workflow

## Route

```text
POST /api/auth/resend-password-otp
```

## Flow

```text
Client
   │
   ▼
ResendPasswordOTPController
   │
   ▼
cooldown.service.js
   │
   ▼
Redis
   │
   ├── Check cooldown
   │
   ├── Generate new OTP
   │
   ├── Store OTP
   │
   └── Set cooldown
   │
   ▼
otp-email.service.js
   │
   ▼
Gmail OAuth2
   │
   ▼
User receives new OTP
```

If cooldown is active:

```text
Request rejected
```

This prevents OTP spam.

---

# 22. Forgot User ID Workflow

## Route

```text
POST /api/auth/forgot-user-id
```

## Flow

```text
Client
   │
   ▼
ForgotUserIdController
   │
   ▼
Find user by email
   │
   ▼
MongoDB
   │
   ▼
Generate OTP
   │
   ▼
Store OTP
   │
   ▼
Redis
   │
   ▼
Send OTP email
```

---

# 23. Verify User ID OTP Workflow

## Route

```text
POST /api/auth/verify-user-otp
```

## Flow

```text
Client
   │
   ▼
ForgotUserIdController
   │
   ▼
Redis
   │
   ▼
Verify OTP
   │
   ▼
Find user
   │
   ▼
MongoDB
   │
   ▼
Return username
```

---

# 24. Email Workflow

The email system is separated into multiple layers.

```text
Controller
   │
   ▼
email.service.js
   │
   ▼
otp-email.service.js
   │
   ▼
email.templates.js
   │
   ▼
email.transporter.js
   │
   ▼
email.oauth.js
   │
   ▼
Google OAuth2
   │
   ▼
Gmail
   │
   ▼
User inbox
```

---

# 25. Google OAuth2 Workflow

Credentials come from `.env`:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REFRESH_TOKEN
```

Flow:

```text
.env
 │
 ▼
email.oauth.js
 │
 ▼
Google OAuth2 Client
 │
 ▼
Refresh Token
 │
 ▼
Google
 │
 ▼
Access Token
 │
 ▼
Nodemailer
 │
 ▼
Gmail
```

Google OAuth2 is used for **sending application emails through Gmail**.

It is separate from the application's JWT authentication system.

---

# 26. Complete Security Workflow

## Password

```text
Plain password
     │
     ▼
bcrypt
     │
     ▼
Hash
     │
     ▼
MongoDB
```

## Access Token

```text
User
 │
 ▼
JWT payload
 │
 ▼
JTI
 │
 ▼
JWT signature
 │
 ▼
JWT_SECRET_KEY
 │
 ▼
Access Token
```

## Session

```text
Session
 │
 ▼
Redis
 │
 ▼
Expiration / Revocation
```

## OTP

```text
OTP
 │
 ▼
Redis
 │
 ▼
TTL
 │
 ▼
Expiration
```

## Email Ownership

```text
Email
 │
 ▼
OTP
 │
 ▼
Redis
 │
 ▼
OTP Verification
 │
 ▼
Email Ownership Confirmed
```

---

# 27. Authentication Relationship

The most important authentication relationship is:

```text
             JWT ACCESS TOKEN
                    │
                    │ contains
                    ▼
                sessionId
                    │
                    ▼
                  REDIS
                    │
                    │ contains
                    ▼
                  userId
                    │
                    ▼
                MONGODB
```

Therefore:

```text
JWT.id
   ==
Redis session.userId
   ==
MongoDB user._id
```

If these values do not match:

```text
Authentication rejected
```

---

# 28. Complete Authentication Summary

## REGISTER

```text
Register
   ↓
Validate
   ↓
Generate OTP
   ↓
Redis
   ↓
Email
   ↓
Verify OTP
   ↓
Create MongoDB user
   ↓
isEmailVerified = true
```

## LOGIN

```text
Email + Password
   ↓
MongoDB
   ↓
bcrypt
   ↓
Email verification check
   ↓
Create Redis session
   ↓
Generate Refresh Token
   ↓
Generate JWT Access Token
   ↓
Set Cookies
```

## PROTECTED API

```text
Access Token
   ↓
JWT Verification
   ↓
Validate sessionId
   ↓
Redis Session Verification
   ↓
JWT.id === session.userId
   ↓
req.user / req.session
   ↓
Controller
```

## ACCESS TOKEN EXPIRED

```text
Access Token
   ↓
Expired
   ↓
401 ACCESS_TOKEN_EXPIRED
   ↓
POST /api/auth/refresh
   ↓
Refresh Token
   ↓
Redis Session
   ↓
New Access Token
```

## LOGOUT

```text
Access Token
   ↓
Verify Session
   ↓
Revoke Redis Session
   ↓
Clear Cookies
```

## FORGOT PASSWORD

```text
Email
   ↓
Find User
   ↓
Generate OTP
   ↓
Redis
   ↓
Email
   ↓
Verify OTP
   ↓
Generate Reset Token
   ↓
Redis
   ↓
New Password
   ↓
bcrypt
   ↓
MongoDB
```

## FORGOT USER ID

```text
Email
   ↓
Find User
   ↓
Generate OTP
   ↓
Redis
   ↓
Email
   ↓
Verify OTP
   ↓
Find User
   ↓
Return Username
```

---

# 29. Complete Request Function Chain

The general function call pattern is:

```text
Client
   │
   ▼
Route
   │
   ▼
Middleware
   │
   ▼
Controller
   │
   ▼
Service
   │
   ├── Model → MongoDB
   │
   ├── Redis Service → Redis
   │
   ├── Email Service → Gmail
   │
   └── Utility → Helper operation
   │
   ▼
Controller
   │
   ▼
Response
```

---

# 30. Debugging Workflow

When an API fails, debug from top to bottom:

```text
1. Frontend request
       ↓
2. URL
       ↓
3. HTTP method
       ↓
4. Main router
       ↓
5. Feature router
       ↓
6. Middleware
       ↓
7. Controller
       ↓
8. Service
       ↓
9. Utility
       ↓
10. Redis / MongoDB / Email
       ↓
11. Controller response
```

---

# 31. Backend Feature Map

```text
AUTHENTICATION
│
├── Register
├── Username Availability
├── Email Availability
├── Registration OTP
├── Login
├── Access Token
├── Refresh Token
├── Session
├── Logout
├── Forgot Password
├── Password OTP
├── Password OTP Resend
├── Reset Password
├── Forgot User ID
└── Verify User ID OTP

EMAIL
│
├── OAuth2
├── Transporter
├── Templates
└── OTP Email

STORAGE
│
├── MongoDB
│   └── Permanent user data
│
└── Redis
    ├── Sessions
    ├── Refresh tokens
    ├── OTP
    ├── Cooldowns
    ├── Recovery data
    └── Reset tokens
```

---

# 32. End-to-End Authentication Architecture

```text
                         CLIENT
                           │
                           ▼
                    Express / app.js
                           │
                           ▼
                    auth.routes.js
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      REGISTER           LOGIN          SESSION
          │                │                │
          ▼                ▼                ▼
    Controllers      Controllers      Controllers
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                       SERVICES
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
       MongoDB           Redis            Email
          │                │                │
          ▼                ▼                ▼
      UserModel        Sessions/OTP     Google OAuth2
                           │                │
                           │                ▼
                           │            Nodemailer
                           │                │
                           │                ▼
                           │              Gmail
                           │
                           ▼
                       Cookies
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         accessToken   refreshToken   sessionId
```

---

# 33. Final Rule

The backend should follow:

```text
ROUTE
  ↓
MIDDLEWARE
  ↓
CONTROLLER
  ↓
SERVICE
  ↓
MODEL / REDIS / EMAIL
  ↓
RESPONSE
```

Controllers handle the HTTP layer.

Services handle business logic.

Models handle MongoDB.

Redis handles temporary/session state.

Utilities handle reusable helper operations.

Email services handle email delivery.

Middleware handles authentication and request protection.

This separation keeps the backend modular, maintainable, testable, and scalable.
