package app

import (
	"bufio"
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"gopkg.in/gomail.v2"
)

const (
	promt string = `
Translate the following text into %s [target language].

Return only valid HTML using these strict rules:

1. If the input is a full sentence or phrase with clear context, just translate without anything but text.

2. If the input is a single word or a short phrase that you have troubles understenging with not enough context:
	- Find at least one, at most 5 meaning of the word or phrase
	- return JSON in the following format:
	{
		"part_of_speech": "noun/adjective/verb/... in target language",
		"meanings": [
			{
				"context": "<context in target language>",
				"translation": "<translated meaning>",
				"example": "<example sentence in target language>"
			},
			...
		]
	}
`
	url          string = "https://api.openai.com/v1/chat/completions"
	model        string = "gpt-3.5-turbo"
	response     string = "response"
	database     string = "database"
	golang       string = "golang"
	partOfSpeech string = "^**_**^"
	context      string = "*^*_*^*"
	definition   string = "^^^_^^^"
	example      string = "**&_&**"
)

var (
	authkey = os.Getenv("OPENAI_API_KEY")
	Db      *sql.DB
)

type Request struct {
	UserID   int    `json:"user_id"`
	Lang     string `json:"lang_code"`
	Text     string `json:"text"`
	Stream   chan *Response
	OneWord  chan *OneWordResponse
	FinalRes *string `json:"final_text"`
	jsonObj  *bool
}

type OneWordResponse struct {
	UserID  int         `json:"user_id"`
	OneWord interface{} `json:"one_word"`
}

type Response struct {
	UserID int    `json:"user_id"`
	Text   string `json:"text"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIReq struct {
	Model       string     `json:"model"`
	Messages    []*message `json:"messages"`
	Stream      bool       `json:"stream"`
	Temperature float64    `json:"temperature"`
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

type CompleteStream struct {
	ID           string
	Object       string
	Created      int64
	Model        string
	FinishReason string
	Text         string
}

type choice struct {
	Delta        *delta  `json:"delta,omitempty"`
	Index        int     `json:"index"`
	FinishReason *string `json:"finish_reason,omitempty"`
}

type delta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

type errorData struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code,omitempty"`
	Param   string `json:"param,omitempty"`
}

type OpenAIError struct {
	Err *errorData `json:"error"`
}

type meaning struct {
	Context     string `json:"context"`
	Translation string `json:"translation"`
	Example     string `json:"example"`
}

type TranslationResponse struct {
	PartOfSpeech string    `json:"part_of_speech"`
	Meanings     []meaning `json:"meanings"`
}

func errorHandler(userID, errid int, f string, err error) {
	message := fmt.Sprintf("userID: %d,<br />function: %s,<br />errorID: %d,<br />error: %s", userID, f, errid, err.Error())
	m := gomail.NewMessage()
	m.SetHeader("From", os.Getenv("email_from"))
	m.SetHeader("To", os.Getenv("email_to"))
	m.SetHeader("Subject", "!!WARNING!! Smart Translation Backend ERROR!")
	m.SetBody("text/html", message)
	fmt.Println(message)
	d := gomail.NewDialer(os.Getenv("email_host"), 587, os.Getenv("email_from"), os.Getenv("email_password"))
	err = d.DialAndSend(m)
	if err != nil {
		fmt.Print(err)
	}
}

func newUser(userID int) bool {
	var amount int
	err := Db.QueryRow("SELECT COUNT(*) FROM Users WHERE id = $1", userID).Scan(&amount)
	if err != nil {
		errorHandler(userID, 0, "newUser()", err)
	}
	return amount == 0
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

func endTransaction(userID int, tx *sql.Tx, goback *bool) {
	var err error
	if *goback {
		tx.Rollback()
	} else {
		err = tx.Commit()
		if err != nil {
			errorHandler(userID, 0, "endTransaction()", err)
		}
	}
}

func updateDB(userID int, cs *CompleteStream) {
	var (
		contentid int
		goback    bool
	)
	tx, err := Db.Begin()
	if err != nil {
		errorHandler(userID, 0, "updateDB()", err)
	} else {
		defer endTransaction(userID, tx, &goback)

		_, err = tx.Exec(`
			INSERT INTO Responses 
			(id, time_creation, model) 
			VALUES ($1, $2, $3)`,
			cs.ID, time.Unix(cs.Created, 0), cs.Model)

		if err != nil {
			errorHandler(userID, 1, "updateDB()", err)
			goback = true
		} else {
			err = tx.QueryRow("SELECT nextval('content_id_seq')").Scan(&contentid)
			if err != nil {
				errorHandler(userID, 2, "updateDB()", err)
				goback = true
			} else {

				_, err = tx.Exec(`
				INSERT INTO Content 
				(id, response_id, object, text, finish_reason) 
				VALUES ($1, $2, $3, $4, $5)`,
					contentid, cs.ID, cs.Object, cs.Text, cs.FinishReason)

				if err != nil {
					errorHandler(userID, 3, "updateDB()", err)
					goback = true
				} else {

					_, err = tx.Exec(`
					INSERT INTO Relations 
					(user_id, response_id, content_id) 
					VALUES ($1, $2, $3)`,
						userID, cs.ID, contentid)

					if err != nil {
						errorHandler(userID, 4, "updateDB()", err)
						goback = true
					}
				}
			}
		}
	}
}

func makeRequest(userID int, body []byte) *http.Response {
	var resp *http.Response
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(body))
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer "+authkey)

	cl := http.Client{}
	resp, err = cl.Do(req)
	if err != nil {
		errorHandler(userID, 1, "callOpenAI()", err)
	}
	return resp
}

func getLineOfBytes(reader *bufio.Reader, i, userID int, isDone *bool) ([]byte, error) {
	lineb, err := reader.ReadBytes('\n')
	if err != nil {
		if err != io.EOF {
			errorHandler(userID, i, "startScanning()", err)
			*isDone = true
			fmt.Println("[DEBUG] the request has ended in error")
		}
	}
	return lineb, err
}

func oneWordRequest(line []byte, isDone *bool) (*TranslationResponse, error) {
	tr := new(TranslationResponse)
	err := json.Unmarshal(line, tr)
	if err == nil {
		*isDone = true
		fmt.Println("[DEBUG] got json from OpenAI API")
	}
	return tr, err
}

func openAPIError(line []byte, i, userID int, isDone *bool) error {
	operr := new(OpenAIError)
	err := json.Unmarshal(line, operr)
	if err == nil {
		if operr.Err != nil {
			err = fmt.Errorf("message: %s, type: %s, param: %s, code: %s",
				operr.Err.Message, operr.Err.Type, operr.Err.Param, operr.Err.Code)
			errorHandler(userID, i, "startScanning()", err)
			*isDone = true
			fmt.Println("[DEBUG] got caught an error from OpenAI API")
		}
	}
	return err
}

func handleStream(line []byte, cs *CompleteStream, i, userID int, stream *chan *Response, isDone *bool) {
	chunk := new(StreamChunk)
	linestr := string(line)
	if strings.HasPrefix(linestr, "data: ") {
		data := strings.TrimPrefix(linestr, "data: ")
		if len(data) > 6 && data[:6] == "[DONE]" {
			*isDone = true
			fmt.Println("[DEBUG] 'done' has been caught. stream's ended")
			fmt.Println("[DEBUG] the text from the response: ", cs.Text)
			updateDB(userID, cs)
		}
		if !*isDone {
			if err := json.Unmarshal([]byte(data), chunk); err != nil {
				errorHandler(userID, i, "callOpenAI()", err)
			} else {
				if cs.ID == "" && chunk.ID != "" {
					cs.ID = chunk.ID
				}
				if cs.Created == 0 && chunk.Created != 0 {
					cs.Created = chunk.Created
				}
				if cs.Model == "" && chunk.Model != "" {
					cs.Model = chunk.Model
				}
				if cs.Object == "" && chunk.Object != "" {
					cs.Object = chunk.Object
				}
				for _, choice := range chunk.Choices {
					if choice != nil && choice.Delta != nil && choice.Delta.Content != "" && choice.FinishReason == nil {
						cs.Text += choice.Delta.Content
						rr := &Response{
							UserID: userID,
							Text:   choice.Delta.Content,
						}
						*stream <- rr
					} else if choice.FinishReason != nil {
						cs.FinishReason = *choice.FinishReason
					}
				}
			}
		}
	}
}

func startScanning(resp *http.Response, r *Request) {
	defer resp.Body.Close()
	var (
		i      int = 2
		isDone     = false
		cs         = new(CompleteStream)
		tr         = new(TranslationResponse)
	)
	reader := bufio.NewReader(resp.Body)
	for !isDone {
		line, err := getLineOfBytes(reader, i, r.UserID, &isDone)
		if err == nil {
			if i == 2 {
				tr, err = oneWordRequest(line, &isDone)
				if err != nil {
					if err = openAPIError(line, i, r.UserID, &isDone); err != nil {
						handleStream(line, cs, i, r.UserID, &r.Stream, &isDone)
					}
				} else {
					r.OneWord <- &OneWordResponse{
						UserID:  r.UserID,
						OneWord: tr,
					}
				}
			}
		}
		i++
	}
}

func isDefaultLanguage(req *Request) {
	var i int
	var lang string
	err := Db.QueryRow("SELECT language, is_chosen FROM Users WHERE id = $1", req.UserID).Scan(&lang, &i)
	if err != nil {
		errorHandler(req.UserID, 0, "isDefaultLanguage()", err)
	} else {
		if i == 1 {
			fmt.Printf("[DEBUG] the language {%s} has been chosen by user\n", lang)
			req.Lang = lang
		} else {
			fmt.Printf("[DEBUG] the language {%s} hasn't been chosen by user\n", lang)
		}
	}
}

func callOpenAI(r *Request) {
	defer close(r.Stream)
	defer close(r.OneWord)
	var resp *http.Response
	openai := &OpenAIReq{
		Model: model,
		Messages: []*message{
			{Role: "assistant", Content: fmt.Sprintf(promt, Languages[r.Lang])},
			{Role: "user", Content: r.Text}},
		Stream:      true,
		Temperature: 0.2,
	}
	body, err := json.Marshal(openai)
	if err != nil {
		errorHandler(r.UserID, 0, "callOpenAI()", err)
	} else {
		fmt.Println("[DEBUG] request to OpenAI has been created and ready to be sent")
		fmt.Printf("[DEBUG] request data: %s\n", string(body))
		resp = makeRequest(r.UserID, body)
		fmt.Println("[DEBUG] response from OpenAI has been caught and ready to be read")
		startScanning(resp, r)
	}
}

func Mainlogic(req *Request, ip string) {
	if req.UserID == 0 || newUser(req.UserID) {
		fmt.Printf("[DEBUG] user {%d} hasn't been found\n", req.UserID)
		req.UserID = addUser(req.Lang, ip)
		fmt.Printf("[DEBUG] user {%d} has been added\n", req.UserID)
	} else {
		fmt.Printf("[DEBUG] user {%d} has been found\n", req.UserID)
		increment(req.UserID)
		fmt.Printf("[DEBUG] user's {%d} attempts have been incremented\n", req.UserID)
	}
	isDefaultLanguage(req)
	callOpenAI(req)
}

func ChangeLanguage(req *Request, ip string) error {
	if newUser(req.UserID) {
		fmt.Printf("[DEBUG] user {%d} hasn't been found\n", req.UserID)
		req.UserID = addUser(req.Lang, ip)
		fmt.Printf("[DEBUG] user {%d} has been added\n", req.UserID)
	} else {
		fmt.Printf("[DEBUG] user {%d} has been found\n", req.UserID)
	}

	_, err := Db.Exec("UPDATE Users SET language = $1, is_chosen = 1 WHERE id = $2", req.Lang, req.UserID)
	if err != nil {
		errorHandler(req.UserID, 0, "ChangeLanguage()", err)
	} else {
		fmt.Printf("[DEBUG] user's {%d} language {%s} has been successfuly changed\n", req.UserID, req.Lang)
	}
	return err
}
