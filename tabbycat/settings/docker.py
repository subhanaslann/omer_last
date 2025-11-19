# ==============================================================================
# Docker
# ==============================================================================

import os

ALLOWED_HOSTS = ["*"]

# ==============================================================================
# CSRF Protection Configuration for Docker
# ==============================================================================
# Django 4.0+ requires CSRF_TRUSTED_ORIGINS for non-HTTPS origins
# Docker port mapping can use dynamic ports, so we need to allow common variations

CSRF_TRUSTED_ORIGINS = [
    # Standard Docker ports
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://0.0.0.0:8000',

    # Without port (default 80)
    'http://localhost',
    'http://127.0.0.1',

    # Common development ports (for dynamic port mapping)
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]

# Add common ports range for Docker Desktop dynamic port mapping
# Windows Docker Desktop often uses ports in 49152-65535 range (dynamic/private ports)
# This fixes "Origin checking failed" errors when using random ports like 52219
for port in range(49152, 65536):  # Full ephemeral port range
    CSRF_TRUSTED_ORIGINS.append(f'http://localhost:{port}')
    CSRF_TRUSTED_ORIGINS.append(f'http://127.0.0.1:{port}')

# Also add common development port range (1024-49151)
for port in range(1024, 49152, 100):  # Every 100 ports to keep list manageable
    CSRF_TRUSTED_ORIGINS.append(f'http://localhost:{port}')
    CSRF_TRUSTED_ORIGINS.append(f'http://127.0.0.1:{port}')

# Allow custom port from environment variable
CUSTOM_PORT = os.environ.get('PORT', None)
if CUSTOM_PORT:
    CSRF_TRUSTED_ORIGINS.append(f'http://localhost:{CUSTOM_PORT}')
    CSRF_TRUSTED_ORIGINS.append(f'http://127.0.0.1:{CUSTOM_PORT}')

# CSRF Cookie settings for Docker environment
CSRF_COOKIE_SAMESITE = 'Lax'  # Allow cross-origin for Docker port mapping
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript access for AJAX requests
CSRF_USE_SESSIONS = False  # Use cookies instead of sessions for better compatibility

# Session Cookie settings
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True  # Keep sessions secure
SESSION_COOKIE_SECURE = False  # Allow HTTP in Docker development

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'tabbycat',
        'USER': 'tabbycat',
        'PASSWORD': 'tabbycat',
        'HOST': 'db',
        'PORT': 5432, # Non-standard to prevent collisions,
    }
}

if bool(int(os.environ['DOCKER_REDIS'])) if 'DOCKER_REDIS' in os.environ else False:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": "redis://redis:6379/1",
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "SOCKET_CONNECT_TIMEOUT": 5,
                "SOCKET_TIMEOUT": 60,
            },
        },
    }

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [("redis", 6379)],
                "group_expiry": 10800,
            },
        },
    }
