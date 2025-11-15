from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import requests

from app.settings import settings


@dataclass
class ProviderModels:
    name: str
    models: List[str]
    available: bool


class ModelRegistry:
    """Fetch and cache model catalogs from upstream providers."""

    def __init__(self):
        self._cache: Dict[Tuple[str, str], Tuple[float, List[str]]] = {}
        self.ttl_seconds = 300

    def _cache_key(self, provider: str, model_type: str) -> Tuple[str, str]:
        return provider.lower(), model_type

    def _get_cached(self, provider: str, model_type: str) -> Optional[List[str]]:
        key = self._cache_key(provider, model_type)
        cached = self._cache.get(key)
        if not cached:
            return None
        timestamp, models = cached
        if time.time() - timestamp > self.ttl_seconds:
            return None
        return models

    def _store_cache(self, provider: str, model_type: str, models: List[str]) -> None:
        key = self._cache_key(provider, model_type)
        self._cache[key] = (time.time(), models)

    def list_llm_models(self, provider: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> List[str]:
        cached = self._get_cached(provider, "llm")
        if cached:
            return cached

        fetcher = getattr(self, f"_fetch_{provider.lower()}_llm", None)
        if fetcher is None:
            return self._fallback_llm(provider)

        try:
            models = fetcher(api_key, base_url)
            if models:
                self._store_cache(provider, "llm", models)
                return models
        except Exception:
            pass

        fallback = self._fallback_llm(provider)
        self._store_cache(provider, "llm", fallback)
        return fallback

    def list_embedding_models(self, provider: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> List[str]:
        cached = self._get_cached(provider, "embedding")
        if cached:
            return cached

        fetcher = getattr(self, f"_fetch_{provider.lower()}_embedding", None)
        if fetcher is None:
            return self._fallback_embedding(provider)

        try:
            models = fetcher(api_key, base_url)
            if models:
                self._store_cache(provider, "embedding", models)
                return models
        except Exception:
            pass

        fallback = self._fallback_embedding(provider)
        self._store_cache(provider, "embedding", fallback)
        return fallback

    # === Provider fetchers ===
    def _fetch_openai_llm(self, api_key: Optional[str], base_url: Optional[str]) -> List[str]:
        if not api_key:
            return []
        url = (base_url or "https://api.openai.com/v1").rstrip("/") + "/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        models = [item["id"] for item in data.get("data", []) if "gpt" in item.get("id", "")]
        return sorted(set(models))

    def _fetch_openai_embedding(self, api_key: Optional[str], base_url: Optional[str]) -> List[str]:
        if not api_key:
            return []
        url = (base_url or "https://api.openai.com/v1").rstrip("/") + "/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        models = [item["id"] for item in data.get("data", []) if "embedding" in item.get("id", "")]
        return sorted(set(models))

    def _fetch_gemini_llm(self, api_key: Optional[str], base_url: Optional[str]) -> List[str]:
        if not api_key:
            return []
        url = (base_url or settings.gemini_base_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/") + "/models"
        params = {"key": api_key}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        models = [item.get("name", "") for item in data.get("models", []) if item.get("supportedGenerationMethods")]
        return sorted(set(models))

    def _fetch_gemini_embedding(self, api_key: Optional[str], base_url: Optional[str]) -> List[str]:
        if not api_key:
            return []
        url = (base_url or settings.gemini_base_url or "https://generativelanguage.googleapis.com/v1beta").rstrip("/") + "/models"
        params = {"key": api_key, "filter": "supported_generation_methods:EMBEDDING"}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        models = [item.get("name", "") for item in data.get("models", [])]
        return sorted(set(models))

    # === Fallbacks ===
    def _fallback_llm(self, provider: str) -> List[str]:
        if provider.lower() == "gemini":
            return ["gemini-2.5-pro", "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"]
        return ["gpt-4o", "gpt-4o-mini", "gpt-4o-mini-translate"]

    def _fallback_embedding(self, provider: str) -> List[str]:
        if provider.lower() == "gemini":
            return ["models/embedding-001"]
        return ["text-embedding-3-small", "text-embedding-3-large"]

    def build_provider_payload(self, api_config: Dict[str, Any]) -> Dict[str, Any]:
        llm_providers = []
        for provider in ["openai", "gemini"]:
            if provider == "openai":
                source_key = api_config.get("llm_api_key") if api_config.get("llm_provider") == "openai" else None
                api_key = source_key or settings.llm_api_key
                source_base = api_config.get("llm_base_url") if api_config.get("llm_provider") == "openai" else None
                base_url = source_base or settings.llm_base_url
            else:
                source_key = api_config.get("llm_api_key") if api_config.get("llm_provider") == "gemini" else None
                api_key = source_key or settings.gemini_api_key
                source_base = api_config.get("llm_base_url") if api_config.get("llm_provider") == "gemini" else None
                base_url = source_base or settings.gemini_base_url

            models = self.list_llm_models(provider, api_key, base_url)
            llm_providers.append(
                {
                    "name": provider,
                    "models": models,
                    "available": bool(api_key),
                }
            )

        embedding_providers = []
        for provider in ["openai", "gemini"]:
            if provider == "openai":
                source_key = (
                    api_config.get("embedding_api_key")
                    if api_config.get("embedding_provider") == "openai"
                    else None
                )
                api_key = source_key or settings.embedding_api_key
                source_base = (
                    api_config.get("embedding_base_url")
                    if api_config.get("embedding_provider") == "openai"
                    else None
                )
                base_url = source_base or settings.embedding_base_url
            else:
                source_key = (
                    api_config.get("embedding_api_key")
                    if api_config.get("embedding_provider") == "gemini"
                    else None
                )
                api_key = source_key or settings.gemini_api_key
                source_base = (
                    api_config.get("embedding_base_url")
                    if api_config.get("embedding_provider") == "gemini"
                    else None
                )
                base_url = source_base or settings.gemini_base_url

            models = self.list_embedding_models(provider, api_key, base_url)
            embedding_providers.append(
                {
                    "name": provider,
                    "models": models,
                    "available": bool(api_key),
                }
            )

        return {
            "llm_providers": llm_providers,
            "embedding_providers": embedding_providers,
        }


model_registry = ModelRegistry()
