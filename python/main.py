from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
import psycopg2
import requests
import asyncio
import sseclient
import json
import st_types as types
import os

app = FastAPI()
con = types.Connection()

MODEL = "openchat-3.5-1210"
URL = "http://localhost:18888/v1/chat/completions" 

def callOpenChat(r: types.RequestResponse, con: types.Connection, istest: bool) -> dict:
    headers = {"Content-Type": "application/json", 
               "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"}
    
    req = {"model": MODEL,
           "messages": [
               {"role": "transtalor", "content": f"you are being given a text in a langauge the user doesn't understand. Your duty is to translate it to the {r.language} language."},
               {"role": "user", "content": "Привет, друг! Я твой русский коллега!"}],
           "stream": "true"}
    
    request = requests.post(URL, stream=True, headers=headers, json=req)
    client = sseclient.SSEClient(request)
    
    for event in client.events():
        if event.data != "[DONE]":
            print(json.loads(event.data)['choices'][0]['text'], end="", flush=True)
    
    # try:
    #     with httpx.Client() as client:
    #         with client.post(URL, json=req.model_dump(), headers=headers) as response:
    #             data = response.json()
    #             chunk = types.StreamChunk(**data)
    #             if not istest and chunk.choices and chunk.choices[0].delt and chunk.choices[0].delt.content:
    #                 con.updateDB(r.userID, chunk)
    #             return types.RequestResponse(user_id=r.userID, langauge_code=r.language, text=chunk.choices[0].delt.content)
    # except httpx.RequestError as err:
    #     raise HTTPException(status_code=502, detail=f"Error connecting to source: {str(err)}")
    # except httpx.HTTPStatusError as err:
    #     raise HTTPException(status_code=err.response.status_code, detail="Source returned an error")

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