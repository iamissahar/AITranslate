from pydantic import BaseModel, Field
from pydantic.config import ConfigDict  
from datetime import datetime
from functools import wraps
import psycopg2
import os


class RequestResponse(BaseModel):
    userID: int = Field(0, alias="user_id")
    language: str = Field(..., alias="language_code")
    text: str = Field(..., alias="text")

class OpenChatReq(BaseModel):
    input: str = Field(..., alias="input")
    model: str = Field(..., alias="model")
    instructions: str = Field(..., alias="instructions")
    stream: bool = Field(..., alias="stream")
    temperature: float = Field(..., alias="temperature")

class Delta(BaseModel):
    role: str = Field("", alias="role")
    content: str = Field("", alias="content")
    
class Choice(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    delt: Delta = Field(None, alias="delta")
    index: int = Field(0, alias="index")
    finishReason: str = Field("", alias="finish_reason")

class Error(BaseModel):
    message: str = Field("", alias="message")
    type: str = Field("", alias="type")
    parameter: str = Field("", alias="param")
    code: str = Field("", alias="code")

class StreamChunk(BaseModel):
    id: str = Field("", alias="id")
    object: str = Field("", alias="object")
    created: int = Field(0, alias="created")
    model: str = Field("", alias="model")
    choices: list[Choice] = Field(None, alias="choices")
    err: Error = Field(None, alias="error")

class Connection:
    con: psycopg2.extensions.connection
    
    def __init__(self):
        self.con = psycopg2.connect(
            dbname=os.getenv("dbname"),
            user=os.getenv("user"),
            password=os.getenv("password"),
            host=os.getenv("host")
        )
        
    def with_cursor(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            with self.con.cursor() as cursor:
                try:
                    result = func(self, cursor, *args, **kwargs)
                    self.con.commit()
                    return result
                except Exception as e:
                    self.con.rollback()
                    raise e
        return wrapper
    
    @with_cursor
    def ping(self, cursor: psycopg2.extensions.cursor):
        assert isinstance(cursor, psycopg2.extensions.cursor) and cursor != None
        cursor.execute("SELECT 1;")
        
    @with_cursor    
    def newUser(self, cursor: psycopg2.extensions.cursor, userID: int) -> bool:
        assert isinstance(cursor, psycopg2.extensions.cursor) and cursor != None
        assert isinstance(userID, int) and userID > 0
        cursor.execute("SELECT COUNT(*) FROM Users WHERE id = %s", (userID,))
        result = cursor.fetchone()
        count = result[0] if result else 0
        return count > 0
                
    @with_cursor     
    def addUser(self, cursor: psycopg2.extensions.cursor, lang: str, ip: str) -> int:
        assert isinstance(cursor, psycopg2.extensions.cursor) and cursor != None
        assert isinstance(lang, str) and lang != ""
        assert isinstance(ip, str) and ip != ""
        cursor.execute("SELECT nextval('users_id_seq')")
        result = cursor.fetchone()
        userID = result[0] if result else 0
        cursor.execute("INSERT INTO Users (id, ip, attempts, language) VALUES (%s, %s, 1, %s)", (userID, ip, lang,))
        return userID
    
    @with_cursor               
    def increment(self, cursor: psycopg2.extensions.cursor, userID: int):
        assert isinstance(cursor, psycopg2.extensions.cursor) and cursor != None
        assert isinstance(userID, int) and userID > 0
        cursor.execute("UPDATE Users SET attempts = attempts + 1 WHERE id = %s", (userID,))
    
    @with_cursor    
    def updateDB(self, cursor: psycopg2.extensions.cursor, userID: int, chunk: StreamChunk):
        assert isinstance(cursor, psycopg2.extensions.cursor) and cursor != None
        assert isinstance(userID, int) and userID > 0
        assert isinstance(chunk, StreamChunk) and chunk != None
        assert len(chunk.choices) > 0 and chunk.choices[0].delt != None
        try:
            cursor.execute("""
                INSERT INTO Responses 
                (id, time_creation, model) 
                VALUES (%s, %s, %s)""", (chunk.id, datetime.fromtimestamp(chunk.created), chunk.model,))
            cursor.execute("""
                INSERT INTO Content 
                (content_index, response_id, object, text) 
                VALUES (%s, %s, %s, %s)""", (chunk.choices[0].index, chunk.id, chunk.object, chunk.choices[0].delt.content,))
            cursor.execute("""
                INSERT INTO Relations 
                (user_id, response_id, content_index) 
                VALUES (%s, %s, %s)""", (userID, chunk.id, chunk.choices[0].index,))
            self.con.commit()
        except psycopg2.Error as err:
            self.con.rollback()

def errorHandler(code: str, message: str):
    print({"error": {"code": code, "message": message}})