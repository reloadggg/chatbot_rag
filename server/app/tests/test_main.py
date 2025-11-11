from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "env" in data
    assert "message" in data


def test_query_endpoint():
    response = client.post("/query", json={"question": "测试问题"})
    assert response.status_code == 200
    data = response.json()
    assert "question" in data
    assert "answer" in data
    assert "status" in data


def test_query_with_empty_question():
    response = client.post("/query", json={"question": ""})
    assert response.status_code == 200
    data = response.json()
    assert data["question"] == ""
    assert "answer" in data


def test_stream_endpoint():
    response = client.get("/stream?question=测试流式问题")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    # 读取流式响应内容
    content = response.text
    assert "data:" in content
    assert "chunk" in content or "status" in content


def test_stream_with_empty_question():
    response = client.get("/stream?question=")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
