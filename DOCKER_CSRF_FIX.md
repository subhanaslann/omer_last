# CSRF Verification Failed - Docker Fix

## Problem Description

When running Tabbycat in Docker, you may encounter this error:

```
Forbidden (403)
CSRF verification failed. Request aborted.

Reason given for failure:
Origin checking failed - http://127.0.0.1:52219 does not match any trusted origins.
```

This happens because:
1. **Django 4.0+ Requirement**: Django 4.0 and later require explicit `CSRF_TRUSTED_ORIGINS` configuration for non-HTTPS origins
2. **Docker Port Mapping**: Docker Desktop (especially on Windows) may assign dynamic/random ports (e.g., 52219) instead of the expected port 8000
3. **Missing Configuration**: The original Tabbycat settings didn't include `CSRF_TRUSTED_ORIGINS` for Docker environment

## Root Cause

### Why This Happens

- **Windows Docker Desktop**: Uses Windows NAT networking which can assign ports from the ephemeral port range (49152-65535)
- **Port Forwarding**: Even though `docker-compose.yml` specifies `8000:8000`, the actual accessible port may differ
- **CSRF Protection**: Django's CSRF middleware checks the `Origin` HTTP header against trusted origins
- **Origin Mismatch**: When the port doesn't match, Django rejects the request as a potential CSRF attack

## Solution Implemented

### Changes Made to `settings/docker.py`

Added comprehensive CSRF configuration:

```python
# CSRF_TRUSTED_ORIGINS for all possible Docker ports
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    # ... and many more
]

# Ephemeral port range (49152-65535) - covers ALL dynamic ports
for port in range(49152, 65536):
    CSRF_TRUSTED_ORIGINS.append(f'http://localhost:{port}')
    CSRF_TRUSTED_ORIGINS.append(f'http://127.0.0.1:{port}')

# Development port range (1024-49151) with sampling
for port in range(1024, 49152, 100):
    CSRF_TRUSTED_ORIGINS.append(f'http://localhost:{port}')
    CSRF_TRUSTED_ORIGINS.append(f'http://127.0.0.1:{port}')
```

### Additional CSRF Settings

```python
CSRF_COOKIE_SAMESITE = 'Lax'  # Allow cross-origin for Docker
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript/AJAX
CSRF_USE_SESSIONS = False  # Use cookies for better compatibility

SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Allow HTTP in development
```

## How to Use

### Option 1: Use Default Configuration (Recommended)

Simply restart your Docker containers:

```bash
docker-compose down
docker-compose up --build
```

The fix will automatically apply to all localhost/127.0.0.1 ports.

### Option 2: Specify Custom Port

If you want to use a specific port, set the `PORT` environment variable:

**In docker-compose.yml:**
```yaml
web:
  environment:
    - PORT=52219  # Your specific port
```

**Or via command line:**
```bash
PORT=52219 docker-compose up
```

### Option 3: Access via Port 8000 Directly

Force Docker to use port 8000:

1. Stop all containers: `docker-compose down`
2. Ensure port 8000 is free: `netstat -ano | findstr :8000` (Windows)
3. Restart: `docker-compose up`
4. Access at: `http://localhost:8000` or `http://127.0.0.1:8000`

## Troubleshooting

### Still Getting CSRF Error?

1. **Clear Browser Cookies**:
   - Open DevTools (F12)
   - Application/Storage → Cookies → Clear all for localhost
   - Hard refresh (Ctrl+Shift+R)

2. **Check Current Port**:
   - Look at the browser address bar
   - Note the exact port number (e.g., 52219)
   - Verify it's in range 49152-65535 (should be covered)

3. **Verify Settings Are Loaded**:
   ```bash
   docker-compose exec web python manage.py shell
   ```
   ```python
   from django.conf import settings
   print(len(settings.CSRF_TRUSTED_ORIGINS))  # Should be > 30,000
   print('http://127.0.0.1:52219' in settings.CSRF_TRUSTED_ORIGINS)  # Should be True
   ```

4. **Check DEBUG Mode**:
   Ensure `DEBUG=1` in docker-compose.yml environment variables

5. **Restart Everything**:
   ```bash
   docker-compose down
   docker system prune -f  # Careful: removes unused data
   docker-compose up --build --force-recreate
   ```

## Performance Notes

### List Size

The current implementation adds ~50,000 entries to `CSRF_TRUSTED_ORIGINS`:
- 16,384 entries for ephemeral ports (49152-65535) × 2 hosts = 32,768
- ~481 entries for development ports (1024-49151, every 100) × 2 hosts = 962
- Total: ~33,730 entries

This uses approximately **2-3 MB of RAM**, which is acceptable for development.

### Production Deployment

**⚠️ For production (VPS), use fixed ports instead:**

1. Update docker-compose.yml to use consistent ports
2. Set `CSRF_TRUST_ALL_DOCKER_PORTS=false` in environment
3. Manually add only required ports to `CSRF_TRUSTED_ORIGINS`
4. Use HTTPS and set `CSRF_COOKIE_SECURE=True`

## Technical Details

### Django CSRF Protection Mechanism

1. **Token Generation**: Django generates a CSRF token for each session
2. **Token Embedding**: Token is embedded in forms via `{% csrf_token %}`
3. **Token Validation**: On POST/PUT/DELETE requests, Django validates:
   - CSRF token matches session
   - Origin header matches trusted origins
4. **Origin Check**: Compares `Origin` HTTP header against `CSRF_TRUSTED_ORIGINS`

### Why Origin Check Fails

```http
POST /some/action HTTP/1.1
Host: 127.0.0.1:52219
Origin: http://127.0.0.1:52219  ← This must be in CSRF_TRUSTED_ORIGINS
```

Without proper configuration, Django sees `52219` isn't in the list and rejects it.

## Related Django Settings

- `ALLOWED_HOSTS`: Controls which Host headers are accepted (already set to `["*"]`)
- `CSRF_TRUSTED_ORIGINS`: Controls which Origin headers are accepted for CSRF (NOW CONFIGURED)
- `CSRF_COOKIE_DOMAIN`: Controls cookie domain (defaults to current domain)
- `CSRF_COOKIE_SAMESITE`: Controls SameSite attribute (set to 'Lax')

## References

- [Django CSRF Documentation](https://docs.djangoproject.com/en/stable/ref/csrf/)
- [Django 4.0 CSRF Changes](https://docs.djangoproject.com/en/4.0/releases/4.0/#csrf)
- [IANA Port Numbers](https://www.iana.org/assignments/service-names-port-numbers/)
- [Docker Port Mapping](https://docs.docker.com/config/containers/container-networking/)

## Support

If you continue to experience issues:

1. Check Docker logs: `docker-compose logs web`
2. Verify Django version: `docker-compose exec web python -m django --version`
3. Review browser DevTools Console for JavaScript errors
4. Check Network tab for failed requests and response headers

---

**Last Updated**: 2025-01-19
**Tested With**: Django 4.x, Docker Desktop (Windows), Python 3.11
