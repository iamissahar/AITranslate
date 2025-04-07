package app

import (
	"bufio"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

const (
	model    string = "gpt-4o"
	response        = "response"
	database        = "database"
	golang          = "golang"
)

var (
	authkey = os.Getenv("OPENAI_API_KEY")
	Db      *sql.DB
)

type Response struct {
	UserID int    `jsno:"user_id"`
	Text   string `json:"text"`
	Error  string `json:"error"`
}

type Request struct {
	UserID int    `json:"user_id"`
	Lang   string `json:"lang_code"`
	Text   string `json:"text"`
}

type OpenAIReq struct {
	Input        string  `json:"input"`
	Model        string  `json:"model"`
	Instructions string  `json:"instructions"`
	Stream       bool    `json:"stream"`
	Temperature  float64 `json:"temperature"`
}

type streamErr struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Param   string `json:"param"`
	Code    string `json:"code"`
}

type StreamChunk struct {
	ID      string     `json:"id"`
	Object  string     `json:"object"`
	Created int64      `json:"created"`
	Model   string     `json:"model"`
	Choices []*choice  `json:"choices"`
	Error   *streamErr `json:"error"`
}

type choice struct {
	Delta        *delta `json:"delta"`
	Index        int    `json:"index"`
	FinishReason string `json:"finish_reason,omitempty"`
}

type delta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

func errorHandler(userID, errid int, f string, err error) {
	err = fmt.Errorf("userID: %d, function: %s, errorid: %d, error: %s", userID, f, errid, err.Error())
	fmt.Println(err)
}

func newUser(userID int) bool {
	var amount int
	err := Db.QueryRow("SELECT COUNT(*) FROM Users WHERE id = $1", userID).Scan(&amount)
	if err != nil {
		errorHandler(userID, 0, "newUser()", err)
	}
	return amount > 0
}

func addUser(lang, ip string) int {
	var userID int
	err := Db.QueryRow("SELECT nextval('users_id_seq')").Scan(&userID)
	if err != nil {
		errorHandler(userID, 0, "addUser", err)
	} else {
		_, err = Db.Exec("INSERT INTO Users (id, ip, attempts, language) VALUES ($1, $2, 1, $3)", userID, ip, lang)
		if err != nil {
			errorHandler(userID, 1, "addUser", err)
		}
	}
	return userID
}

func increment(userID int) {
	_, err := Db.Exec("UPDATE Users SET attempts = attempts + 1 WHERE id = $1", userID)
	if err != nil {
		errorHandler(userID, 0, "increment()", err)
	}
}

func endTransaction(userID int, tx *sql.Tx) {
	var err error
	if p := recover(); p != nil {
		tx.Rollback()
		panic(p)
	} else if err != nil {
		tx.Rollback()
	} else {
		err = tx.Commit()
		if err != nil {
			errorHandler(userID, 10, "saveResp()", err)
		}
	}
}

func updateDB(userID int, resp StreamChunk) {
	tx, err := Db.Begin()
	if err != nil {
		errorHandler(userID, 0, "saveResp()", err)
	} else {
		defer endTransaction(userID, tx)

		_, err = tx.Exec(`
			INSERT INTO Responses 
			(id, time_creation, model) 
			VALUES ($1, $2, $3)`,
			resp.ID, time.Unix(resp.Created, 0), resp.Model)

		if err != nil {
			errorHandler(userID, 1, "saveResp()", err)
		} else {

			_, err = tx.Exec(`
				INSERT INTO Content 
				(content_index, response_id, object, text) 
				VALUES ($1, $2, $3, $4)`,
				resp.Choices[0].Index, resp.ID, resp.Object, resp.Choices[0].Delta.Content)

			if err != nil {
				errorHandler(userID, 2, "saveResp()", err)
			} else {

				_, err = tx.Exec(`
					INSERT INTO Relations 
					(user_id, response_id, content_index) 
					VALUES ($1, $2, $3)`,
					userID, resp.ID, resp.Choices[0].Index)

				if err != nil {
					errorHandler(userID, 3, "saveResp()", err)
				}
			}
		}
	}
}

func responseWork(userID int, resp StreamChunk, ctx *gin.Context) {
	r := Response{
		UserID: userID,
		Text:   resp.Choices[0].Delta.Content,
	}
	updateDB(userID, resp)
	ctx.JSON(http.StatusOK, r)
}

func makeRequest(userID int, body []byte) *http.Response {
	var resp *http.Response
	req, err := http.NewRequest(http.MethodPost, "https://api.openai.com/v1/responses", bytes.NewBuffer(body))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+authkey)

	cl := http.Client{}
	resp, err = cl.Do(req)
	if err != nil {
		errorHandler(userID, 1, "callOpenAI()", err)
	}
	return resp
}

func startScaning(resp *http.Response, userID int, ctx *gin.Context, workForResponse func(int, StreamChunk, *gin.Context)) {
	var (
		chunk StreamChunk
		i     int = 2
	)
	fmt.Println(chunk)
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Println(line)
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				break
			}

			if err := json.Unmarshal([]byte(data), &chunk); err != nil {
				errorHandler(userID, i, "callOpenAI()", err)
			} else {

				if len(chunk.Choices) > 0 {
					text := chunk.Choices[0].Delta.Content
					if text != "" {
						workForResponse(userID, chunk, ctx)
					}
				}
			}
		}
		i++
	}
}

func callOpenAI(r Request, responseWork func(int, StreamChunk, *gin.Context), ctx *gin.Context) {
	var resp *http.Response
	openai := &OpenAIReq{
		Input:        r.Text,
		Model:        model,
		Instructions: fmt.Sprintf("Translate the text I give you to the language: %s. Answer with everything, but the actual transtaltion. No need to put it in put in quotes, or anything else I need only pure translated text", r.Lang),
		Stream:       true,
		Temperature:  0.2,
	}
	body, err := json.Marshal(openai)
	if err != nil {
		errorHandler(r.UserID, 0, "callOpenAI()", err)
	} else {
		fmt.Printf("Request: %s\n", string(body))
		resp = makeRequest(r.UserID, body)
		startScaning(resp, r.UserID, ctx, responseWork)
	}
}

func Mainlogic(req Request, ctx *gin.Context) {
	if newUser(req.UserID) {
		req.UserID = addUser(req.Lang, ctx.ClientIP())
	} else {
		increment(req.UserID)
	}

	callOpenAI(req, responseWork, ctx)
}
