import os
from pathlib import Path

from dotenv import load_dotenv
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = [
    h.strip()
    for h in os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if h.strip()
]

# Django test client sends Host: testserver by default.
if "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

# --- Apps ---

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Local
    "apps.ehr",
]

# --- Middleware ---

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database ---

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ImproperlyConfigured("DATABASE_URL must be set to a PostgreSQL connection string.")

DATABASES = {
    "default": dj_database_url.config(
        default=DATABASE_URL,
    ),
}

# --- Auth ---

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n ---

LANGUAGE_CODE = "pt-br"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

# --- Static ---

STATIC_URL = "static/"
# Where `collectstatic` will gather static files for production/docker usage
STATIC_ROOT = os.getenv("STATIC_ROOT", str(BASE_DIR / "staticfiles"))

# --- DRF ---

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "EXCEPTION_HANDLER": "apps.ehr.api.exception_handler.custom_exception_handler",
}

# --- CORS ---

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

# --- Gemini (transcription) ---

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_TRANSCRIPTION_MODEL = os.getenv("GEMINI_TRANSCRIPTION_MODEL", "gemini-2.5-flash")
GEMINI_WRITER_MODEL = os.getenv("GEMINI_WRITER_MODEL", "")


# --- Stubs (local dev / demo without real API keys) ---

USE_STUBS = os.getenv("USE_STUBS", "false").lower() in ("true", "1", "yes")

# --- Default PK ---

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
