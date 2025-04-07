from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
import psycopg2
import httpx
import asyncio
import json
import st_types as types
import os

app = FastAPI()
con = types.Connection()

MODEL = "MODEL_TYPE"
URL = "http://localhost:18888/v1/chat/completions" 

def callOpenChat(r: types.RequestResponse, con: types.Connection, istest: bool) -> dict:
    headers = {"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
               "Content-Type": "application/json"}
    
    req = types.OpenChatReq(
        input=r.text, 
        model=MODEL, 
        instructions=f"Translate the text I give you to the language: {r.language}. Answer with everything, but the actual translation. No need to put it in quotes, or anything else I need only pure translated text",
        stream=False,
        temperature=0.2
    )
    
    try:
        with httpx.Client() as client:
            with client.post(URL, json=req.model_dump(), headers=headers) as response:
                data = response.json()
                chunk = types.StreamChunk(**data)
                if not istest and chunk.choices and chunk.choices[0].delt and chunk.choices[0].delt.content:
                    con.updateDB(r.userID, chunk)
                return types.RequestResponse(user_id=r.userID, langauge_code=r.language, text=chunk.choices[0].delt.content)
    except httpx.RequestError as err:
        raise HTTPException(status_code=502, detail=f"Error connecting to source: {str(err)}")
    except httpx.HTTPStatusError as err:
        raise HTTPException(status_code=err.response.status_code, detail="Source returned an error")

def mainHandler(req: types.RequestResponse, con: types.Connection):
    try:
        assert con != None
        assert req != None
        assert req.language != ""
        assert req.text != ""
        if con.newUser(req.userID):
            req.userID = con.addUser(req.language)
        else:
            assert req.userID != 0
            con.increment(req.userID)
    except AssertionError as err:
        types.errorHandler("invalid input data", f"{err}")
    except psycopg2.Error as err:
        types.errorHandler("database request error", f"{err}")

@app.post("/translate")
async def startAPI(request: Request):
    global con
    body = await request.json()
    try:
        data = types.RequestResponse(**body)
        try:
            assert data.language != ""
            assert data.text != ""
            mainHandler(data, con)
            return callOpenChat
        except AssertionError as asserr:
            raise HTTPException(
                status_code=400, 
                detail={"error":
                    {"code": "invalid request data", 
                        "message": f"Language_code and text are required. {asserr}"}
                    }
                )
    except ValidationError as valderr:
        raise HTTPException(
                status_code=400, 
                detail={"error":
                    {"code": "invalid request data", 
                        "message": f"cannot validate a json object into a class. {valderr}"}
                    }
                )
    
async def main():
    global con
    con.ping()
    await startAPI()

if __name__ == "__main__":
    asyncio.run(main())