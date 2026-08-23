# AI Interview Backend — Architecture

## 1. Architecture Overview

The AI Interview backend uses a layered and modular architecture.

```text
Node.js
   │
   ▼
Express.js
   │
   ├── Routes
   ├── Middleware
   ├── Controllers
   ├── Services
   ├── Models
   ├── Utilities
   └── Configuration
```

External infrastructure:

```text
MongoDB
Redis
Gmail / Google OAuth2
```

Authentication architecture:

```text
JWT Access Token
       +
Refresh Token
       +
Redis Session
       +
HTTP Cookies
```

---

# 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │        CLIENT        │
                         │    React / Axios     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Express App      │
                         │       app.js         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Main Auth Router  │
                         │ auth.routes.js       │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │  Register   │    │    Login    │    │   Session   │
          │   Routes    │    │   Routes    │    │   Routes    │
          └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Controllers      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       Services       │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │   MongoDB   │    │    Redis    │    │    Email    │
          └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
                 │                  │                  │
                 ▼                  ▼                  ▼
             UserModel         Sessions/OTP       Gmail OAuth2
```

---

# 3. Current Project Structure

```text
Backend/
│
├── server.js
├── .env
├── package.json
│
└── src/
    │
    ├── app.js
    │
    ├── test-email.js
    ├── test-google-oauth.js
    │
    ├── config/
    │   ├── database.js
    │   └── redis.js
    │
    ├── controllers/
    │   └── auth/
    │       ├── checkUsername.auth.controller.js
    │       ├── email.auth.controller.js
    │       ├── forgotUserId.controller.js
    │       ├── login.auth.controller.js
    │       ├── logout.auth.controller.js
    │       ├── oauth.controller.js
    │       ├── refresh.auth.controller.js
    │       ├── register.auth.controller.js
    │       ├── user.auth.controller.js
    │       ├── verifyRegistration.controller.js
    │       │
    │       └── recovery/
    │           ├── forgotPassword.recovery.auth.controller.js
    │           ├── forgotUserId.controller.js
    │           ├── resendPasswordOTP.recovery.auth.controller.js
    │           ├── resetPassword.recovery.auth.controller.js
    │           └── verifyPasswordOTP.recovery.auth.controller.js
    │
    ├── middleware/
    │   └── auth.middleware.js
    │
    ├── model/
    │   └── user.model.js
    │
    ├── routes/
    │   ├── auth.routes.js
    │   │
    │   └── auth/
    │       ├── login.routes.js
    │       ├── recovery.routes.js
    │       ├── register.routes.js
    │       └── session.routes.js
    │
    ├── services/
    │   ├── email.service.js
    │   ├── recovery.service.js
    │   ├── registration.service.js
    │   ├── session.service.js
    │   │
    │   ├── email/
    │   │   ├── email.oauth.js
    │   │   ├── email.templates.js
    │   │   ├── email.transporter.js
    │   │   └── otp-email.service.js
    │   │
    │   └── recovery/
    │       ├── cooldown.service.js
    │       ├── otp.service.js
    │       ├── recovery.config.js
    │       ├── recovery.keys.js
    │       └── reset-token.service.js
    │
    └── utils/
        ├── cookie.utils.js
        ├── jwt.utils.js
        ├── otp.utils.js
        │
        ├── email/
        │   ├── emailDomain.email.utils.js
        │   ├── index.email.utils.js
        │   └── maskEmail.email.utils.js
        │
        └── registration/
            └── registration.validation.utils.js
```

---

# 4. Root-Level Architecture

## `server.js`

Responsible for starting the backend.

```text
server.js
   │
   ▼
Load environment
   │
   ▼
Import app
   │
   ▼
Start HTTP server
```

`server.js` should not contain business logic.

---

## `.env`

Contains sensitive configuration.

Examples:

```text
MongoDB connection
Redis configuration
JWT secrets
JWT issuer
JWT audience
Access token expiration
Refresh token configuration
Google OAuth2 credentials
Email configuration
```

Secrets must never be hardcoded into source files.

---

## `package.json`

Defines:

```text
Dependencies
Scripts
Project metadata
Node/NPM configuration
```

---

# 5. Application Layer

## `src/app.js`

This is the Express application layer.

Responsibilities:

```text
Express initialization
       │
       ├── JSON parser
       ├── Cookie parser
       ├── CORS
       └── Route registration
```

Main route:

```text
/api/auth
```

Architecture:

```text
app.js
 │
 ├── Middleware
 │
 └── auth.routes.js
```

---

# 6. Configuration Layer

Directory:

```text
src/config/
```

Contains infrastructure configuration.

```text
config/
├── database.js
└── redis.js
```

---

## `database.js`

Responsible for MongoDB connection.

```text
Application
    │
    ▼
database.js
    │
    ▼
Mongoose
    │
    ▼
MongoDB
```

---

## `redis.js`

Responsible for Redis connection.

```text
Application
    │
    ▼
redis.js
    │
    ▼
Redis Client
    │
    ▼
Redis Server
```

---

# 7. Routing Layer

Directory:

```text
src/routes/
```

Structure:

```text
routes/
├── auth.routes.js
│
└── auth/
    ├── login.routes.js
    ├── recovery.routes.js
    ├── register.routes.js
    └── session.routes.js
```

---

# 8. Main Authentication Router

## `auth.routes.js`

Acts as the main authentication router.

Conceptually:

```text
/api/auth
    │
    ├── login
    ├── register
    ├── recovery
    └── session
```

Feature-specific routes are separated to prevent one huge routing file.

---

# 9. Registration Router

## `register.routes.js`

Responsible for registration-related endpoints.

Examples:

```text
POST /api/auth/register

GET /api/auth/check-username

GET /api/auth/check-email

POST /api/auth/verify-registration
```

Architecture:

```text
register.routes.js
       │
       ▼
Registration Controllers
       │
       ▼
Registration Services
```

---

# 10. Login Router

## `login.routes.js`

Responsible for login-related routes.

```text
POST /api/auth/login
```

Architecture:

```text
login.routes.js
       │
       ▼
LoginUserController
       │
       ▼
session.service.js
       │
       ├── Redis
       ├── JWT
       └── Cookies
```

---

# 11. Session Router

## `session.routes.js`

Responsible for session-related operations.

Examples:

```text
POST /api/auth/refresh

POST /api/auth/logout
```

Architecture:

```text
session.routes.js
       │
       ▼
Authentication Middleware
       │
       ▼
Session Controller
       │
       ▼
session.service.js
       │
       ▼
Redis
```

---

# 12. Recovery Router

## `recovery.routes.js`

Responsible for password and account recovery operations.

Examples:

```text
POST /api/auth/forgot-password

POST /api/auth/verify-password-otp

POST /api/auth/resend-password-otp

POST /api/auth/reset-password

POST /api/auth/forgot-user-id

POST /api/auth/verify-user-otp
```

Architecture:

```text
recovery.routes.js
       │
       ▼
Recovery Controllers
       │
       ▼
Recovery Services
       │
       ▼
Redis / MongoDB / Email
```

---

# 13. Controller Layer

Directory:

```text
src/controllers/
```

Controllers represent the HTTP layer.

Responsibilities:

```text
Read request
   │
   ├── req.body
   ├── req.query
   ├── req.params
   └── req.cookies
   │
   ▼
Call services
   │
   ▼
Handle result/errors
   │
   ▼
Send response
```

Controllers should not contain unnecessary infrastructure logic.

---

# 14. Authentication Controllers

```text
controllers/auth/
│
├── checkUsername.auth.controller.js
├── email.auth.controller.js
├── forgotUserId.controller.js
├── login.auth.controller.js
├── logout.auth.controller.js
├── oauth.controller.js
├── refresh.auth.controller.js
├── register.auth.controller.js
├── user.auth.controller.js
└── verifyRegistration.controller.js
```

These controllers represent authentication-related HTTP operations.

---

# 15. Recovery Controllers

```text
controllers/auth/recovery/
│
├── forgotPassword.recovery.auth.controller.js
├── forgotUserId.controller.js
├── resendPasswordOTP.recovery.auth.controller.js
├── resetPassword.recovery.auth.controller.js
└── verifyPasswordOTP.recovery.auth.controller.js
```

Recovery operations are isolated from normal login/registration controllers.

---

# 16. Middleware Layer

Directory:

```text
src/middleware/
```

Current authentication middleware:

```text
auth.middleware.js
```

Responsibilities:

```text
Read accessToken
      │
      ▼
Verify JWT
      │
      ▼
Validate claims
      │
      ▼
Validate session
      │
      ▼
Redis
      │
      ▼
Attach:
req.user
req.session
```

Protected controller execution only happens after these checks pass.

---

# 17. Model Layer

Directory:

```text
src/model/
```

Current model:

```text
user.model.js
```

The model represents the MongoDB user document.

```text
Controller
   │
   ▼
UserModel
   │
   ▼
Mongoose
   │
   ▼
MongoDB
```

The model is responsible for database structure and model-level database operations.

---

# 18. Service Layer

Directory:

```text
src/services/
```

Services contain reusable business logic and infrastructure coordination.

```text
services/
├── email.service.js
├── recovery.service.js
├── registration.service.js
└── session.service.js
```

---

# 19. Registration Service

## `registration.service.js`

Responsible for registration-specific business logic.

Conceptually:

```text
Registration Controller
        │
        ▼
registration.service.js
        │
        ├── Temporary registration data
        ├── OTP coordination
        ├── Redis
        └── User creation
```

---

# 20. Session Service

## `session.service.js`

Responsible for authentication session operations.

Responsibilities include:

```text
Create session
Verify session
Refresh session
Revoke session
Session expiration
Session/user relationship
```

Architecture:

```text
Controller
   │
   ▼
session.service.js
   │
   ▼
Redis
```

---

# 21. Recovery Service

## `recovery.service.js`

Coordinates password/account recovery operations.

```text
Recovery Controller
       │
       ▼
recovery.service.js
       │
       ├── OTP service
       ├── Cooldown service
       ├── Reset token service
       ├── Redis
       └── MongoDB
```

---

# 22. Email Service Architecture

Main files:

```text
services/
├── email.service.js
│
└── email/
    ├── email.oauth.js
    ├── email.templates.js
    ├── email.transporter.js
    └── otp-email.service.js
```

Dependency direction:

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
```

---

# 23. Email OAuth Layer

## `email.oauth.js`

Responsible for Google OAuth2 authentication.

```text
Environment Variables
        │
        ▼
email.oauth.js
        │
        ▼
Google OAuth2 Client
        │
        ▼
Access Token
```

---

# 24. Email Transport Layer

## `email.transporter.js`

Responsible for creating/configuring the Nodemailer transporter.

```text
Google OAuth2
      │
      ▼
Access Token
      │
      ▼
Nodemailer Transporter
      │
      ▼
Gmail
```

---

# 25. Email Template Layer

## `email.templates.js`

Responsible for email content.

Examples:

```text
Registration OTP
Password Recovery OTP
User ID Recovery OTP
Other authentication emails
```

Templates are separated from the transport mechanism.

---

# 26. OTP Email Service

## `otp-email.service.js`

Coordinates OTP-specific emails.

```text
OTP
 │
 ▼
otp-email.service.js
 │
 ├── Select template
 ├── Prepare email
 └── Call email transport
 │
 ▼
Gmail
```

---

# 27. Recovery Services

Directory:

```text
services/recovery/
```

```text
cooldown.service.js
otp.service.js
recovery.config.js
recovery.keys.js
reset-token.service.js
```

---

## `cooldown.service.js`

Responsible for OTP resend restrictions.

```text
Request resend
      │
      ▼
Check Redis cooldown
      │
      ├── Active → reject
      │
      └── Expired → allow
```

---

## `otp.service.js`

Responsible for recovery OTP operations.

```text
Generate
Store
Retrieve
Verify
Invalidate
```

Redis provides temporary storage and TTL.

---

## `recovery.config.js`

Contains recovery-related configuration.

Examples:

```text
OTP expiration
Cooldown duration
Reset token expiration
Recovery limits
```

---

## `recovery.keys.js`

Centralizes Redis key generation for recovery operations.

Conceptually:

```text
User/email
   │
   ▼
Recovery key
   │
   ▼
Redis
```

Centralizing keys prevents inconsistent Redis key formats.

---

## `reset-token.service.js`

Responsible for password reset tokens.

```text
Verified OTP
    │
    ▼
Generate reset token
    │
    ▼
Redis
    │
    ▼
Validate during password reset
```

---

# 28. Utility Layer

Directory:

```text
src/utils/
```

Current utilities:

```text
utils/
├── cookie.utils.js
├── jwt.utils.js
├── otp.utils.js
│
├── email/
│   ├── emailDomain.email.utils.js
│   ├── index.email.utils.js
│   └── maskEmail.email.utils.js
│
└── registration/
    └── registration.validation.utils.js
```

---

# 29. JWT Utility

## `jwt.utils.js`

Responsible for access-token generation.

```text
User
 │
 ▼
generateToken(user, sessionId)
 │
 ▼
Generate JTI
 │
 ▼
JWT payload
 │
 ▼
Sign JWT
 │
 ▼
Access Token
```

JWT contains:

```text
id
username
sessionId
jti
```

---

# 30. Cookie Utility

## `cookie.utils.js`

Responsible for authentication cookie operations.

```text
setAuthCookies()
       │
       ├── accessToken
       ├── refreshToken
       └── sessionId
```

Also handles cookie clearing during logout.

---

# 31. OTP Utility

## `otp.utils.js`

Responsible for reusable OTP generation logic.

```text
OTP Utility
    │
    ▼
Generate secure OTP
    │
    ▼
Return OTP
```

Storage and lifecycle management can then be handled by the relevant service.

---

# 32. Email Utility Architecture

Directory:

```text
utils/email/
```

### `emailDomain.email.utils.js`

Responsible for email domain validation.

```text
Email
 │
 ▼
Extract domain
 │
 ▼
DNS MX lookup
 │
 ▼
Valid / Invalid domain
```

### `index.email.utils.js`

Provides email-related utility exports/helpers.

### `maskEmail.email.utils.js`

Responsible for masking email addresses when displaying them to users.

Example concept:

```text
anchit@gmail.com
       ↓
a*****@gmail.com
```

---

# 33. Registration Utility

## `registration.validation.utils.js`

Responsible for registration-specific validation.

```text
Username
Email
Password
Registration fields
```

Architecture:

```text
Register Controller
      │
      ▼
registration.validation.utils.js
      │
      ▼
Validation Result
```

---

# 34. Data Architecture

The backend uses MongoDB and Redis for different purposes.

```text
                    DATA
                     │
             ┌───────┴────────┐
             │                │
             ▼                ▼
          MongoDB           Redis
             │                │
             ▼                ▼
       Permanent Data    Temporary Data
```

### MongoDB

```text
Users
Profiles
Credentials
Application data
```

### Redis

```text
Sessions
Refresh tokens
OTP
Cooldowns
Recovery data
Reset tokens
Revocation state
```

---

# 35. Authentication Architecture

```text
                    AUTH
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
    Password        JWT         Session
       │             │             │
       ▼             ▼             ▼
    bcrypt        Signing       Redis
       │             │             │
       ▼             ▼             ▼
   MongoDB       Cookies       Session State
```

---

# 36. Access Token Architecture

```text
User
 │
 ▼
generateToken()
 │
 ▼
JWT
 │
 ├── id
 ├── username
 ├── sessionId
 └── jti
 │
 ▼
JWT_SECRET_KEY
 │
 ▼
Short-lived Access Token
```

---

# 37. Refresh Token Architecture

```text
Login
 │
 ▼
Create Redis Session
 │
 ├── sessionId
 ├── userId
 └── refresh token information
 │
 ▼
Refresh Token
 │
 ▼
HTTP Cookie
```

The refresh token is tied to the Redis session.

---

# 38. Session Architecture

```text
                   SESSION
                      │
                      ▼
                  sessionId
                      │
                      ▼
                    Redis
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
           userId         refresh state
             │
             ▼
          MongoDB
```

---

# 39. Authentication Identity Chain

The most important identity relationship is:

```text
JWT.id
   │
   │ must equal
   ▼
Redis.session.userId
   │
   │ must equal
   ▼
MongoDB.user._id
```

Also:

```text
JWT.sessionId
       │
       ▼
Redis session
```

And:

```text
JWT.jti
       │
       ▼
Session/token validation
```

This prevents a valid JWT from being used with an invalid/revoked session.

---

# 40. Protected Request Architecture

```text
Client
   │
   ▼
accessToken Cookie
   │
   ▼
Protected Route
   │
   ▼
auth.middleware.js
   │
   ├── JWT signature
   ├── issuer
   ├── audience
   ├── expiration
   ├── id
   ├── sessionId
   └── jti
   │
   ▼
verifyAccessSession()
   │
   ▼
Redis
   │
   ▼
Validate session
   │
   ▼
req.user
req.session
   │
   ▼
Controller
```

---

# 41. Layer Dependency Rules

The preferred dependency direction is:

```text
Routes
   ↓
Middleware
   ↓
Controllers
   ↓
Services
   ↓
Models / Infrastructure
```

Utilities can be consumed by the appropriate layer:

```text
Controllers
   ↓
Utilities

Services
   ↓
Utilities
```

Infrastructure:

```text
Services / Models
       ↓
MongoDB / Redis / Gmail
```

---

# 42. Responsibility Matrix

| Layer          | Responsibility                                 |
| -------------- | ---------------------------------------------- |
| `server.js`    | Start Node.js server                           |
| `app.js`       | Configure Express                              |
| `config/`      | MongoDB and Redis configuration                |
| `routes/`      | API endpoint definitions                       |
| `middleware/`  | Authentication/request protection              |
| `controllers/` | HTTP request/response handling                 |
| `services/`    | Business logic and infrastructure coordination |
| `model/`       | MongoDB/Mongoose data layer                    |
| `utils/`       | Reusable helper functions                      |
| MongoDB        | Permanent application data                     |
| Redis          | Sessions, OTP and temporary data               |
| Google OAuth2  | Gmail authorization                            |
| Nodemailer     | Email transport                                |
| JWT            | Access-token authentication                    |
| bcrypt         | Password hashing/verification                  |

---

# 43. Controller vs Service

## Controller

Controller is the HTTP layer.

```text
req
 │
 ▼
Controller
 │
 ├── Read request
 ├── Validate HTTP input
 ├── Call service
 ├── Handle result
 └── Send response
```

## Service

Service is the business/integration layer.

```text
Controller
    │
    ▼
Service
    │
    ├── Business rules
    ├── Redis
    ├── MongoDB
    ├── Email
    └── Other services
```

---

# 44. Model Responsibility

Models should represent persistent MongoDB data.

```text
Controller
   │
   ▼
Service
   │
   ▼
UserModel
   │
   ▼
Mongoose
   │
   ▼
MongoDB
```

Models should not handle:

```text
HTTP responses
Cookies
JWT middleware
Email transport
Frontend logic
```

---

# 45. Redis Responsibility

Redis is not a replacement for MongoDB.

```text
MongoDB
   │
   └── Permanent application data

Redis
   │
   ├── Temporary data
   ├── Sessions
   ├── OTP
   ├── Cooldowns
   ├── Reset tokens
   └── Revocation state
```

---

# 46. Email Responsibility

Email infrastructure is isolated:

```text
Controller
   ↓
Email Service
   ↓
OTP Email Service
   ↓
Template
   ↓
Transporter
   ↓
OAuth2
   ↓
Gmail
```

This allows email implementation to be changed without rewriting authentication controllers.

---

# 47. Complete Folder Dependency Diagram

```text
src/
│
├── app.js
│    │
│    ▼
├── routes/
│    │
│    ▼
├── middleware/
│    │
│    ▼
├── controllers/
│    │
│    ▼
├── services/
│    │
│    ├───────────────┐
│    ▼               ▼
├── model/         utils/
│    │               │
│    ▼               │
MongoDB              │
                    │
                    ▼
                  Redis
                    │
                    ▼
                  Email
                    │
                    ▼
               Google OAuth2
```

---

# 48. Complete Backend Architecture

```text
                         CLIENT
                           │
                           ▼
                    ┌────────────┐
                    │  Express   │
                    │   app.js   │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │   Routes   │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │ Middleware │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │Controllers │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │  Services  │
                    └─────┬──────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
            ▼             ▼             ▼
        ┌────────┐   ┌────────┐   ┌────────────┐
        │ Models │   │ Redis  │   │   Email    │
        └────┬───┘   └────┬───┘   └─────┬──────┘
             │            │             │
             ▼            ▼             ▼
         MongoDB        Redis      Google OAuth2
                                       │
                                       ▼
                                     Gmail
```

---

# 49. Authentication Architecture

```text
                         LOGIN
                           │
                           ▼
                     UserModel
                           │
                           ▼
                      bcrypt
                           │
                           ▼
                   Email Verified?
                           │
                           ▼
                    createSession()
                           │
                           ▼
                         Redis
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        Refresh Token              sessionId
              │                         │
              └────────────┬────────────┘
                           ▼
                    generateToken()
                           │
                           ▼
                     Access Token
                           │
                           ▼
                      HTTP Cookies
```

---

# 50. Refresh Architecture

```text
Access Token
     │
     ▼
Expired
     │
     ▼
POST /api/auth/refresh
     │
     ▼
RefreshAuthController
     │
     ▼
Redis Session
     │
     ├── Exists
     ├── Valid refresh token
     └── Not revoked
     │
     ▼
generateToken()
     │
     ▼
New Access Token
```

---

# 51. Logout Architecture

```text
Client
   │
   ▼
Logout Request
   │
   ▼
auth.middleware.js
   │
   ▼
Validate Access Token
   │
   ▼
Validate Redis Session
   │
   ▼
Logout Controller
   │
   ▼
session.service.js
   │
   ▼
Revoke/Delete Session
   │
   ▼
Clear Cookies
```

---

# 52. Recovery Architecture

```text
                 RECOVERY
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
 Password Recovery          User ID Recovery
        │                       │
        ▼                       ▼
      OTP                     OTP
        │                       │
        ▼                       ▼
      Redis                   Redis
        │                       │
        ▼                       ▼
 Verification              Verification
        │                       │
        ▼                       ▼
 Reset Token               Find User
        │                       │
        ▼                       ▼
 New Password              Username
        │
        ▼
     MongoDB
```

---

# 53. Security Architecture

```text
                         SECURITY
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
    Password              JWT                 Session
       │                    │                    │
       ▼                    ▼                    ▼
    bcrypt              Signature             Redis
       │                    │                    │
       ▼                    ▼                    ▼
   MongoDB             Secret Key          Revocation
```

OTP security:

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
Automatic expiration
```

Email security:

```text
Google OAuth2
 │
 ▼
Refresh Token
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

---

# 54. Debugging Architecture

When a feature breaks, follow the dependency chain.

```text
Frontend
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Utility
   ↓
MongoDB / Redis / Email
```

Examples:

### Registration problem

```text
register.routes.js
   ↓
register.auth.controller.js
   ↓
registration.service.js
   ↓
Redis
   ↓
otp-email.service.js
   ↓
email.service.js
   ↓
Gmail
```

### Login problem

```text
login.routes.js
   ↓
login.auth.controller.js
   ↓
UserModel
   ↓
MongoDB
   ↓
bcrypt
   ↓
session.service.js
   ↓
Redis
   ↓
jwt.utils.js
   ↓
cookie.utils.js
```

### Protected API problem

```text
Route
   ↓
auth.middleware.js
   ↓
jwt.utils / JWT verification
   ↓
session.service.js
   ↓
Redis
   ↓
Controller
```

### Password recovery problem

```text
recovery.routes.js
   ↓
Recovery Controller
   ↓
recovery.service.js
   ↓
otp.service.js
   ↓
cooldown.service.js
   ↓
reset-token.service.js
   ↓
Redis
   ↓
Email Service
```

---

# 55. Architecture Principle

The backend follows this primary design rule:

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
```

Each layer has one primary responsibility.

```text
Routes
→ Where the request goes

Middleware
→ Whether the request is allowed

Controllers
→ HTTP request/response

Services
→ Business logic

Models
→ Persistent database data

Redis
→ Temporary/session data

Utils
→ Reusable helpers

Email Services
→ Email infrastructure
```

---

# 56. Final Architecture Map

```text
AI INTERVIEW BACKEND
│
├── SERVER
│   ├── server.js
│   └── app.js
│
├── CONFIG
│   ├── database.js
│   └── redis.js
│
├── ROUTES
│   ├── auth.routes.js
│   └── auth/
│       ├── login.routes.js
│       ├── register.routes.js
│       ├── recovery.routes.js
│       └── session.routes.js
│
├── MIDDLEWARE
│   └── auth.middleware.js
│
├── CONTROLLERS
│   └── auth/
│       ├── Registration
│       ├── Login
│       ├── Session
│       ├── User
│       ├── OAuth
│       ├── Email
│       └── Recovery
│
├── SERVICES
│   ├── registration.service.js
│   ├── session.service.js
│   ├── recovery.service.js
│   ├── email.service.js
│   │
│   ├── email/
│   │   ├── OAuth
│   │   ├── Transporter
│   │   ├── Templates
│   │   └── OTP Email
│   │
│   └── recovery/
│       ├── OTP
│       ├── Cooldown
│       ├── Reset Token
│       ├── Keys
│       └── Config
│
├── MODELS
│   └── user.model.js
│
├── UTILS
│   ├── JWT
│   ├── Cookies
│   ├── OTP
│   ├── Email
│   └── Registration Validation
│
└── INFRASTRUCTURE
    ├── MongoDB
    ├── Redis
    └── Gmail / Google OAuth2
```

---

# 57. Final System Relationship

```text
                    ┌───────────────┐
                    │    CLIENT     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    EXPRESS    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    ROUTES     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  MIDDLEWARE   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  CONTROLLERS  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   SERVICES    │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          ┌────────┐    ┌────────┐   ┌────────────┐
          │MongoDB │    │ Redis  │   │   Gmail    │
          └────────┘    └────────┘   └────────────┘
              │             │             │
              │             │             │
              ▼             ▼             ▼
          Permanent      Sessions       Email
            Data        OTP / Tokens    Delivery
```

The resulting backend is a **modular authentication architecture** where MongoDB manages persistent user data, Redis manages temporary/session state, JWT provides short-lived access authentication, refresh tokens maintain sessions, cookies transport authentication credentials, and Google OAuth2/Nodemailer provide secure email delivery.
