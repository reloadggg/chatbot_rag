#!/usr/bin/env python3
"""
Simple smoke-test runner for the FastAPI backend.

It logs in with the system password, hits core endpoints (/auth/status,
/providers, /auth/config, /healthz, /query, /stream, /upload), and optionally
tests guest auth plus Gemini routes when extra flags/configurations are provided.

Usage:
    python test_api.py --password <SYSTEM_PASSWORD>

See the README section "API 测试脚本" for full details and options.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from requests import Response, Session


class APITester:
    def __init__(
        self,
        base_url: str,
        system_password: str,
        provider: str,
        question: str,
        stream_question: Optional[str],
        upload_path: Optional[Path],
        timeout: float,
        guest_config: Optional[Dict[str, Any]],
        test_gemini: bool,
        gemini_question: Optional[str],
        gemini_file: Optional[Path],
    ) -> None:
        if not system_password:
            raise ValueError("System password is required to hit authenticated endpoints.")

        self.base_url = base_url.rstrip("/")
        self.system_password = system_password
        self.provider = provider
        self.question = question
        self.stream_question = stream_question or question
        self.upload_path = upload_path
        self.timeout = timeout
        self.guest_config = guest_config
        self.test_gemini = test_gemini
        self.gemini_question = gemini_question or question
        self.gemini_file = gemini_file

        self.session: Session = requests.Session()
        self.errors: List[str] = []
        self.access_token: Optional[str] = None

    # ---------- public API ----------
    def run(self) -> int:
        steps = [
            ("auth_status", self.check_auth_status),
            ("login", self.login),
            ("providers", self.get_providers),
            ("auth_config", self.get_auth_config),
            ("healthz", self.health_check),
            ("query", self.simple_query),
            ("stream", self.stream_query),
            ("upload", self.upload_document),
        ]

        for label, func in steps:
            self._run_step(label, func)

        if self.guest_config:
            self._run_step("guest_login", self.guest_login)

        if self.test_gemini:
            self._run_step("gemini_info", self.gemini_info)
            self._run_step("gemini_models", self.gemini_models)
            self._run_step("gemini_upload", self.gemini_upload)

        if self.errors:
            print("\n❌ 接口测试存在失败：")
            for err in self.errors:
                print(f"   - {err}")
            return 1

        print("\n✅ 所有已启用的接口测试通过。")
        return 0

    # ---------- core endpoints ----------
    def check_auth_status(self) -> Dict[str, Any]:
        data = self._json("GET", "/auth/status")
        return {
            "system_mode_enabled": data.get("system_mode_enabled"),
            "auth_required": data.get("auth_required"),
        }

    def login(self) -> Dict[str, Any]:
        payload = {"password": self.system_password, "provider": self.provider}
        data = self._json("POST", "/auth/login", json=payload)
        token = data.get("access_token")
        if not token:
            raise RuntimeError("Missing access token in /auth/login response.")
        self.access_token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        return {"user_type": data.get("user_type"), "provider": self.provider}

    def get_providers(self) -> Dict[str, Any]:
        data = self._json("GET", "/providers")
        return {
            "llm_providers": len(data.get("llm_providers", [])),
            "embedding_providers": len(data.get("embedding_providers", [])),
        }

    def get_auth_config(self) -> Dict[str, Any]:
        data = self._json("GET", "/auth/config")
        config = data.get("config") or {}
        return {
            "llm_provider": config.get("llm_provider"),
            "embedding_provider": config.get("embedding_provider"),
        }

    def health_check(self) -> Dict[str, Any]:
        data = self._json("GET", "/healthz")
        return {"status": data.get("status"), "llm_model": data.get("llm_model")}

    def simple_query(self) -> Dict[str, Any]:
        payload = {"question": self.question}
        data = self._json("POST", "/query", json=payload)
        return {"status": data.get("status"), "provider": data.get("provider")}

    def stream_query(self) -> Dict[str, Any]:
        url = self._url("/stream")
        params = {"question": self.stream_question}
        with self.session.get(
            url, params=params, stream=True, timeout=(5, self.timeout)
        ) as resp:
            resp.raise_for_status()
            chunks: List[str] = []
            for line in resp.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                chunks.append(payload)
                if '"status": "done"' in payload:
                    break
            if not chunks:
                raise RuntimeError("Stream endpoint returned no data events.")
            return {"events": len(chunks), "last_event": chunks[-1]}

    def upload_document(self) -> Dict[str, Any]:
        description = f"API自动测试@{time.strftime('%H:%M:%S')}"
        if self.upload_path:
            file_path = self.upload_path.expanduser().resolve()
            if not file_path.exists():
                raise FileNotFoundError(f"Upload file not found: {file_path}")
            with open(file_path, "rb") as fh:
                files = {"file": (file_path.name, fh, "application/octet-stream")}
                data = {"description": description, "process": "true"}
                resp = self._json("POST", "/upload", files=files, data=data)
        else:
            sample = f"自动生成的测试文档，时间戳：{time.time()}".encode("utf-8")
            files = {"file": ("rag-test.txt", sample, "text/plain")}
            data = {"description": description, "process": "true"}
            resp = self._json("POST", "/upload", files=files, data=data)
        return {"file_id": resp.get("file_id"), "chunks": resp.get("chunks_count")}

    # ---------- optional flows ----------
    def guest_login(self) -> Dict[str, Any]:
        if not self.guest_config:
            raise RuntimeError("Guest config not provided.")
        data = self._json("POST", "/auth/guest", json=self.guest_config)
        return {
            "user_type": data.get("user_type"),
            "providers": len(data.get("providers", {}).get("llm_providers", [])),
        }

    def gemini_info(self) -> Dict[str, Any]:
        data = self._json("GET", "/gemini/info")
        return {"available": data.get("available"), "model": data.get("model")}

    def gemini_models(self) -> Dict[str, Any]:
        data = self._json("GET", "/gemini/models")
        return {"available": data.get("available"), "models": len(data.get("models", []))}

    def gemini_upload(self) -> Dict[str, Any]:
        question = self.gemini_question or "帮我总结这份文件"
        file_path = self.gemini_file or self.upload_path
        if not file_path:
            sample = f"Gemini 测试文档 {time.time()}".encode("utf-8")
            files = {"file": ("gemini-test.txt", sample, "text/plain")}
        else:
            resolved = file_path.expanduser().resolve()
            if not resolved.exists():
                raise FileNotFoundError(f"Gemini upload file not found: {resolved}")
            files = {"file": (resolved.name, open(resolved, "rb"), "application/octet-stream")}
        data = {"question": question, "process": "true"}

        try:
            resp = self._json("POST", "/gemini/upload-file", files=files, data=data)
        finally:
            file_obj = files["file"][1]
            if hasattr(file_obj, "close"):
                file_obj.close()
        return {
            "filename": resp.get("filename"),
            "gemini_file_name": resp.get("gemini_file_name"),
        }

    # ---------- helpers ----------
    def _run_step(self, label: str, func) -> None:
        title = label.replace("_", " ")
        print(f"\n▶ 正在测试 {title} ...")
        try:
            result = func()
        except Exception as exc:  # pylint: disable=broad-except
            message = f"{label} failed: {exc}"
            self.errors.append(message)
            print(f"   ❌ {message}")
            return
        summary = json.dumps(result, ensure_ascii=False)
        print(f"   ✅ 成功：{summary}")

    def _json(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        resp = self._request(method, path, **kwargs)
        return resp.json()

    def _request(self, method: str, path: str, **kwargs) -> Response:
        url = self._url(path)
        resp = self.session.request(method, url, timeout=self.timeout, **kwargs)
        resp.raise_for_status()
        return resp

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return f"{self.base_url}{path}"


def parse_guest_config(raw: Optional[str]) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    candidate = Path(raw)
    if candidate.exists():
        return json.loads(candidate.read_text(encoding="utf-8"))
    return json.loads(raw)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Test FastAPI endpoints locally.")
    parser.add_argument("--base-url", default=os.getenv("API_BASE_URL", "http://localhost:8000"))
    parser.add_argument("--password", default=os.getenv("SYSTEM_PASSWORD"))
    parser.add_argument("--provider", default=os.getenv("LLM_PROVIDER", "openai"))
    parser.add_argument("--question", default="简单介绍一下这个知识库系统。")
    parser.add_argument("--stream-question", default=None)
    parser.add_argument("--upload-file", type=Path, default=None, help="Path to a file used for /upload.")
    parser.add_argument("--timeout", type=float, default=30.0, help="Request timeout in seconds.")
    parser.add_argument("--guest-config", default=None, help="JSON string or file path for /auth/guest payload.")
    parser.add_argument("--test-gemini", action="store_true", help="Hit /gemini/* endpoints as well.")
    parser.add_argument("--gemini-question", default=None)
    parser.add_argument("--gemini-file", type=Path, default=None)
    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    guest_config = parse_guest_config(args.guest_config)

    tester = APITester(
        base_url=args.base_url,
        system_password=args.password or "",
        provider=args.provider,
        question=args.question,
        stream_question=args.stream_question,
        upload_path=args.upload_file,
        timeout=args.timeout,
        guest_config=guest_config,
        test_gemini=bool(args.test_gemini),
        gemini_question=args.gemini_question,
        gemini_file=args.gemini_file,
    )

    return tester.run()


if __name__ == "__main__":
    sys.exit(main())
