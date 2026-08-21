# backend/app/services/translations/__init__.py
from app.services.translations.translation_service import TranslationService

# Alias for backwards compatibility
GameDumpTranslationService = TranslationService

__all__ = ["TranslationService", "GameDumpTranslationService"]
