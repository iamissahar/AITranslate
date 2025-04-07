import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from types import SimpleNamespace
from datetime import datetime
import unittest
import time
import main
import httpx
import st_types as types

IP = "198.168.23.12"
LANGUAGE = "en"
USERID = 1
CHUNK = types.StreamChunk(
    id = "askhjdasjkldklja123kl3klj1",
    object = "just an object",
    created = int(time.time()),
    model = main.MODEL,
    choices = [types.Choice(
        delt= types.Delta(role = '', content = "Hi! It's OpenChat. How can I help you?"),
        index = 9,
        finishReason = '')]
)

class TestConnection(unittest.TestCase):
    con: types.Connection
    
    def setUp(self):
        self.con = types.Connection()
    
    def test_newUser(self):
        self.assertRaises(AssertionError, self.con.newUser, 0)
        self.assertRaises(AssertionError, self.con.newUser, "string")
        self.assertRaises(AssertionError, self.con.newUser, -31)
        self.assertRaises(AssertionError, self.con.newUser, None)
        
        try:
            self.con.addUser(LANGUAGE, IP)
            self.assertEqual(self.con.newUser(USERID), True, "it should find a created user based on their id")
        finally:
            _deleteUser(self.con)
    
    def test_addUser(self):
        self.assertRaises(AssertionError, self.con.addUser, 0, 0)
        self.assertRaises(AssertionError, self.con.addUser, None, "str")
        self.assertRaises(AssertionError, self.con.addUser, LANGUAGE, 0)
        self.assertRaises(AssertionError, self.con.addUser, LANGUAGE, None)

        try:
            self.assertEqual(self.con.addUser(LANGUAGE, IP), USERID, "the id returned from the function has to be 1")
        finally:
            _deleteUser(self.con)

    def test_increment(self):
        self.assertRaises(AssertionError, self.con.increment, "string")
        self.assertRaises(AssertionError, self.con.increment, 0)
        self.assertRaises(AssertionError, self.con.increment, -231)
        self.assertRaises(AssertionError, self.con.increment, None)
        
        try:
            self.con.addUser(LANGUAGE, IP)
            self.con.increment(USERID)
            self.assertEqual(_didIncrease(self.con, 2), True)
        finally:
            _deleteUser(self.con)
    
    def test_updateDB(self):
        self.con.addUser(LANGUAGE, IP)
        self.assertRaises(AssertionError, self.con.updateDB, None, None)
        self.assertRaises(AssertionError, self.con.updateDB, "string", None)
        self.assertRaises(AssertionError, self.con.updateDB, -31231, None)
        self.assertRaises(AssertionError, self.con.updateDB, 0, None)
        self.assertRaises(AssertionError, self.con.updateDB, USERID, None)
        self.assertRaises(AssertionError, self.con.updateDB, USERID, "string")
        self.assertRaises(AssertionError, self.con.updateDB, USERID, 0)
        self.assertRaises(AssertionError, self.con.updateDB, USERID, {"error": "message"})
        
        try:
            self.con.updateDB(USERID, CHUNK)
            self.assertEqual(_didUpdate(self.con), [True, True, True], "all of 3 table have to be updated")
        finally:
            _cleanDB(self.con)

@pytest.fixture
def client():
    return TestClient(main.app)

@pytest.mark.asyncio
async def test_stream_endpoint(monkeypatch, client):
    class MockResponse:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def aiter_text(self):
            yield 'data: {"id": "test123", "object": "chat", "created": 1234567890, "model": "MODEL_TYPE", "choices": [{"delta": {"content": "translated"}, "index": 0, "finish_reason": ""}]}'
            yield 'data: {"id": "test123", "object": "chat", "created": 1234567890, "model": "MODEL_TYPE", "choices": [{"delta": {"content": "text"}, "index": 0, "finish_reason": ""}]}'
        def raise_for_status(self):
            pass

    class MockAsyncClient:
        async def stream(self, *args, **kwargs):
            return MockResponse()
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass

    monkeypatch.setattr(httpx, "AsyncClient", MockAsyncClient)
    
    response = client.post("/translate", json={"user_id": 1, "language_code": "es", "text": "Hello"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream"
    assert "".join(response.iter_content()) == "translatedtext"

def _deleteUser(con):
    with con.con.cursor() as cursor:
        cursor.execute("ALTER SEQUENCE users_id_seq RESTART WITH 1")
        cursor.execute("DELETE FROM Users")
        con.con.commit()

def _didIncrease(con, expected) -> bool:
    with con.con.cursor() as cursor:
        cursor.execute("SELECT attempts FROM Users WHERE id = %s", (USERID,))
        result = cursor.fetchone()
        attempts = result[0] if result else 0
        return attempts == expected

def _didUpdate(con):
    with con.con.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM Responses WHERE id = %s AND time_creation = %s AND model = %s", (CHUNK.id, datetime.fromtimestamp(CHUNK.created), CHUNK.model,))
        result = cursor.fetchone()
        count = result[0] if result else 0
        arr = [count > 0]
        
        cursor.execute("SELECT COUNT(*) FROM Content WHERE content_index = %s AND response_id = %s AND object = %s AND text = %s", (CHUNK.choices[0].index, CHUNK.id, CHUNK.object, CHUNK.choices[0].delt.content,))
        result = cursor.fetchone()
        count = result[0] if result else 0
        arr.append(count > 0)
        
        cursor.execute("SELECT COUNT(*) FROM Relations WHERE user_id = %s AND response_id = %s AND content_index = %s", (USERID, CHUNK.id, CHUNK.choices[0].index,))
        result = cursor.fetchone()
        count = result[0] if result else 0
        arr.append(count > 0)
        return arr

def _cleanDB(con):
    with con.con.cursor() as cursor:
        cursor.execute("ALTER SEQUENCE users_id_seq RESTART WITH 1")
        cursor.execute("DELETE FROM Users")
        cursor.execute("DELETE FROM Responses")
        cursor.execute("DELETE FROM Content")
        cursor.execute("DELETE FROM Relations")
        con.con.commit()