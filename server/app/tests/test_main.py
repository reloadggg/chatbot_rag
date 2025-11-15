import io
from typing import Dict

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import auth_manager
from app.document_processor import document_processor
from app.rag import rag_pipeline

client = TestClient(app)


@pytest.fixture(autouse=True)
def configure_system_password():
    original_password = auth_manager.system_password
    auth_manager.system_password = 'testpass1'
    yield
    auth_manager.system_password = original_password


@pytest.fixture(autouse=True)
def reset_guest_sessions():
    auth_manager.guest_sessions.clear()
    yield
    auth_manager.guest_sessions.clear()


@pytest.fixture(autouse=True)
def isolate_upload_dir(tmp_path):
    original_dir = document_processor.upload_dir
    temp_dir = tmp_path / 'uploads'
    temp_dir.mkdir()
    document_processor.upload_dir = temp_dir
    yield
    document_processor.upload_dir = original_dir


@pytest.fixture(autouse=True)
def stub_rag_pipeline(monkeypatch):
    rag_pipeline.provider = 'openai'

    def fake_query(question: str, config: Dict | None = None):
        provider = (config or {}).get('llm_provider') or 'openai'
        return f'mock answer for {question}', provider

    def fake_stream(question: str, config: Dict | None = None):
        yield 'mock-stream'

    def fake_add_documents(documents):
        return True

    def fake_delete_documents(file_id: str):
        return True

    def fake_stats():
        return {
            'document_count': 0,
            'vector_db': 'chroma',
            'embedding_model': 'text-embedding-3-small',
            'llm_model': 'gpt-4o-mini',
            'llm_provider': 'openai',
            'status': 'active',
        }

    monkeypatch.setattr(rag_pipeline, 'query', fake_query)
    monkeypatch.setattr(rag_pipeline, 'stream_query', fake_stream)
    monkeypatch.setattr(rag_pipeline, 'add_documents', fake_add_documents)
    monkeypatch.setattr(rag_pipeline, 'delete_documents', fake_delete_documents)
    monkeypatch.setattr(rag_pipeline, 'get_document_stats', fake_stats)
    yield


def get_headers(token: str | None = None) -> Dict[str, str]:
    if not token:
        return {}
    return {'Authorization': f'Bearer {token}'}


def login_system(password: str = 'testpass1') -> str:
    response = client.post('/auth/login', json={'password': password, 'provider': 'env'})
    assert response.status_code == 200
    data = response.json()
    return data['access_token']


def login_guest() -> str:
    payload = {
        'llm_provider': 'openai',
        'llm_model': 'gpt-4o-mini',
        'llm_api_key': 'sk-demo',
        'llm_base_url': 'https://api.openai.com/v1',
        'embedding_provider': 'openai',
        'embedding_model': 'text-embedding-3-small',
        'embedding_api_key': 'sk-demo',
        'embedding_base_url': 'https://api.openai.com/v1',
    }
    response = client.post('/auth/guest', json=payload)
    assert response.status_code == 200
    return response.json()['access_token']


def test_health_check_requires_auth():
    response = client.get('/healthz')
    assert response.status_code == 401


def test_system_login_success():
    response = client.post('/auth/login', json={'password': 'testpass1', 'provider': 'env'})
    assert response.status_code == 200
    data = response.json()
    assert data['user_type'] == 'system'
    assert 'access_token' in data


def test_guest_login_returns_token_and_config():
    payload = {
        'llm_provider': 'openai',
        'llm_model': 'gpt-4o-mini',
        'llm_api_key': 'sk-demo',
        'llm_base_url': 'https://api.openai.com/v1',
        'embedding_provider': 'openai',
        'embedding_model': 'text-embedding-3-small',
        'embedding_api_key': 'sk-demo',
        'embedding_base_url': 'https://api.openai.com/v1',
    }
    response = client.post('/auth/guest', json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data['user_type'] == 'guest'
    assert data['config']['llm_provider'] == 'openai'
    assert 'access_token' in data


def test_query_endpoint_returns_answer():
    token = login_guest()
    response = client.post(
        '/query',
        json={'question': '测试问题'},
        headers=get_headers(token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['provider'] == 'openai'
    assert 'mock answer' in data['answer']


def test_stream_endpoint_streams_data():
    token = login_guest()
    response = client.get('/stream?question=流式问题', headers=get_headers(token))
    assert response.status_code == 200
    assert 'mock-stream' in response.text


def test_documents_endpoints_authenticated_flow():
    token = login_guest()
    headers = get_headers(token)

    # Initially empty list
    response = client.get('/documents', headers=headers)
    assert response.status_code == 200
    assert response.json() == []

    # Upload a document
    file_content = io.BytesIO(b'hello world')
    upload_response = client.post(
        '/upload',
        data={'description': 'demo', 'process': 'true'},
        files={'file': ('demo.txt', file_content, 'text/plain')},
        headers=headers,
    )
    assert upload_response.status_code == 200
    upload_data = upload_response.json()
    assert upload_data['status'] == 'success'
    file_id = upload_data['file_id']

    # List documents after upload
    list_response = client.get('/documents', headers=headers)
    assert list_response.status_code == 200
    docs = list_response.json()
    assert any(doc['file_id'] == file_id for doc in docs)

    # Stats endpoint
    stats_response = client.get('/documents/stats', headers=headers)
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert 'total_files' in stats
    assert 'vector_db_stats' in stats

    # Delete document
    delete_response = client.delete(f'/documents/{file_id}', headers=headers)
    assert delete_response.status_code == 200

    # Delete non-existent document returns 404
    missing_response = client.delete('/documents/unknown', headers=headers)
    assert missing_response.status_code == 404
