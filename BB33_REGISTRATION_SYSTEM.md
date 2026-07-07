# FULLTERPS33 - BB33 Registration System Implementation

## Overview
This document describes the BB33-style token-based registration system implemented for FULLTERPS33. The system replaces traditional email/password authentication with auto-generated tokens and pseudonyms, matching the BreakingBad33.com model.

## System Architecture

### Core Components

#### 1. User Model
```
users table:
- id: serial primary key
- token: text unique (JWT HMAC-SHA256)
- pseudo: text unique (auto-generated)
- loyalty_points: integer (default 0)
- loyalty_adjustment: integer (default 0)
- flags: jsonb (for user status flags)
- created_at: timestamptz (registration time)
- created_ip: text (registration IP for tracking)
```

#### 2. IP Registration Tracker
```
user_registrations_ip table:
- id: serial primary key
- ip: text unique
- count: integer (registration attempts)
- last_registration: timestamptz
```

### Registration Flow

1. **User visits /signup** → Sees premium signup page with FULLTERPS33 branding
2. **Click "CRÉER MON COMPTE"** → Triggers `registerUser()` Server Action
3. **IP Limit Check** → Verifies less than 1 registration from this IP in last 30 days
4. **Generate Credentials** → 
   - `generatePseudo()` creates unique random username
   - `generateToken()` creates HMAC-SHA256 JWT
5. **Create User** → Insert into `users` table
6. **Track Registration** → Insert/update `user_registrations_ip`
7. **Set Session** → httpOnly cookie with signed token
8. **Display Success** → Show pseudo + token to user

## Key Functions

### `/lib/user-generator.ts`
- `generatePseudo()`: Creates unique random pseudonyms (e.g., "Phoenix_7734")
- `generateToken()`: Creates HMAC-SHA256 JWT tokens with crypto

### `/app/actions/auth.ts`
- `registerUser()`: Main registration function with all validation
- `checkIPLimit()`: Verifies IP hasn't registered in last 30 days
- Server Action exports for Client Component calls

### `/app/signup/page.tsx`
- Premium signup UI component
- Handles user interactions and API calls
- Shows success state with credentials

### `/lib/auth.ts` (Enhanced)
- `setCustomerSession()`: Now accepts token strings or numeric IDs
- `getCustomerToken()`: New function to retrieve token from session

## Security Features

1. **Token Signing**: HMAC-SHA256 with SESSION_SECRET env var
2. **HttpOnly Cookies**: Tokens stored in secure httpOnly cookies
3. **IP-Based Rate Limiting**: Max 1 registration per IP per month
4. **Unique Constraints**: Tokens and pseudos are unique in database
5. **SQL Injection Prevention**: Parameterized queries with sql`` template
6. **Error Handling**: Detailed logging for debugging, user-friendly errors

## Database Schema Updates

### New Tables Created
```sql
-- Users table with token-based auth
CREATE TABLE users (
  id serial primary key,
  token text unique not null,
  pseudo text not null,
  loyalty_points integer default 0,
  created_at timestamptz default now(),
  created_ip text
);

-- Track IP registrations for rate limiting
CREATE TABLE user_registrations_ip (
  id serial primary key,
  ip text unique,
  count integer default 1,
  last_registration timestamptz default now()
);
```

### Updated Tables
```sql
-- Orders now reference users via token
ALTER TABLE orders ADD COLUMN user_token text REFERENCES users(token);
```

## API Endpoints

### Server Actions (Client-side callable)
- `registerUser()` → `POST` equivalent, returns `{ok, message, token?, pseudo?}`
- `checkIPLimit(ip)` → Validates registration eligibility

### No REST endpoints needed
- All registration through Server Actions (Next.js 15+)
- Reduces API surface area and improves security

## Design & UI

### Signup Page (`/signup`)
- Premium FULLTERPS33 branding
- Violet electric color scheme (#B355FF)
- Lightning bolt animations
- Responsive grid layout
- Call-to-action button with gradient

### User Token Display
- Shows generated pseudo
- Displays full token (can be copied)
- QR code for easy sharing (future)

## Environment Variables Required

```
SESSION_SECRET=<openssl rand -base64 32>  # For token signing
ADMIN_PASSWORD=<secure-password>          # For admin panel
BETTER_AUTH_SECRET=<openssl rand -base64 32>  # If using Better Auth
DATABASE_URL=<neon-postgresql-url>        # Neon database
```

## Testing Checklist

- [ ] Signup page loads with all design elements
- [ ] Token generation creates unique values
- [ ] Pseudo generation creates unique values
- [ ] IP limit enforces 1 account per month
- [ ] Database inserts successful
- [ ] Session cookie set correctly
- [ ] Error handling works for duplicates
- [ ] Error handling works for invalid IPs
- [ ] Mobile responsive design works

## Production Deployment Checklist

- [ ] Remove `/admin/demo` route before deploying
- [ ] Verify all environment variables set on Vercel
- [ ] Test token expiration (currently 1 year)
- [ ] Verify httpOnly cookie settings
- [ ] Enable HTTPS in production
- [ ] Monitor database for performance
- [ ] Set up error logging/monitoring
- [ ] Create database backups strategy
- [ ] Document token format for API consumers

## Comparison with BB33

| Feature | BB33 | FULLTERPS33 |
|---------|------|------------|
| Auth Method | Token only | Token only |
| Pseudo | Auto-generated | Auto-generated |
| Rate Limit | 1/month per IP | 1/month per IP |
| Token Format | JWT HMAC-SHA256 | JWT HMAC-SHA256 |
| Session Storage | HttpOnly cookie | HttpOnly cookie |
| Password Required | No | No |
| Email Required | No | No |

## Future Enhancements

1. Token refresh mechanism
2. QR code for token sharing
3. Token revocation/reset
4. Multi-device sessions
5. Advanced loyalty system
6. Referral token generation
7. Admin token management
8. Usage analytics per token

## Support & Troubleshooting

### Issue: "Limit: 1 compte par IP par mois"
**Solution**: User already registered from this IP this month. Wait 30 days or use different IP/VPN.

### Issue: Duplicate token error
**Solution**: Extremely rare (1 in 2^256). Refresh and try again.

### Issue: Cookie not setting
**Solution**: Check HTTPS in production, httpOnly setting, CORS headers.

### Issue: Token validation fails
**Solution**: Verify SESSION_SECRET env var matches between deployment.

## References

- JWT Standard: https://tools.ietf.org/html/rfc7519
- HMAC-SHA256: https://en.wikipedia.org/wiki/HMAC
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- Neon PostgreSQL: https://neon.tech/docs
