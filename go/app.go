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
		fmt.Println(tr)
		fmt.Println("[DEBUG] got json from OpenAI API")
	}
	return tr, err
}

func openAPIError(line []byte, i, userID int, isDone *bool) {
	operr := new(OpenAIError)
	err := json.Unmarshal(line, operr)
	if err == nil {
		if operr.Err != nil {
			err = fmt.Errorf("message: %s, type: %s, param: %s, code: %s",
				operr.Err.Message, operr.Err.Type, operr.Err.Param, operr.Err.Code)
			errorHandler(userID, i, "startScanning()", err)
			*isDone = true
			fmt.Println(operr)
			fmt.Println("[DEBUG] got caught an error from OpenAI API")
		}
	}
}

func handleStream(line []byte, cs *CompleteStream, i int, r *Request, isDone *bool) {
	chunk := new(StreamChunk)
	linestr := string(line)
	if strings.HasPrefix(linestr, "data: ") {
		data := strings.TrimPrefix(linestr, "data: ")
		if len(data) > 6 && data[:6] == "[DONE]" {
			*isDone = true
			fmt.Println("[DEBUG] 'done' has been caught. stream's ended")
			fmt.Println("[DEBUG] the text from the response: ", cs.Text)
			updateDB(r.UserID, cs)
		}
		if !*isDone {
			if err := json.Unmarshal([]byte(data), chunk); err != nil {
				errorHandler(r.UserID, i, "callOpenAI()", err)
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
						*r.FinalRes += choice.Delta.Content
						rr := &Response{
							UserID: r.UserID,
							Text:   choice.Delta.Content,
						}
						r.Stream <- rr
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
		s      string
	)
	reader := bufio.NewReader(resp.Body)
	for !isDone {
		line, err := getLineOfBytes(reader, i, r.UserID, &isDone)
		if err == nil {
			if i == 2 {
				openAPIError(line, i, r.UserID, &isDone)
				cs.Text = ""
			}
			r.FinalRes = &s
			handleStream(line, cs, i, r, &isDone)
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

func isResponseValid(tr *TranslationResponse, r *Request) (bool, error) {
	var found bool
	var err error
	if tr.PartOfSpeech == "" {

	}
	if tr.Meanings == nil {

	} else {
		if len(tr.Meanings) >= 1 && len(tr.Meanings) <= 5 {
			for i := 0; i < len(tr.Meanings) && !found; i++ {
				m := tr.Meanings[i]
				if m.Context == "" || m.Example == "" || m.Translation == "" {
					found = true
				}
			}

			if found {
				tr, err = getResponseWithOpenAI(r)
			}
		}
	}
	return found == false, err
}

func getResponseWithOpenAI(r *Request) (*TranslationResponse, error) {
	var (
		resp     *http.Response
		body, bb []byte
		op       = new(OpenAI)
		data     TranslationResponse
		err      error
		ok       bool
	)
	l := Languages[r.Lang]
	openai := &OpenAIReq{
		Model: l[1],
		Messages: []*message{
			{Role: "assistant", Content: fmt.Sprintf(promtV2, l[0], l[0], l[0], l[0], l[0])},
			{Role: "user", Content: r.Text}},
		Stream:      false,
		Temperature: 0.0,
	}
	body, err = json.Marshal(openai)
	if err != nil {
		errorHandler(r.UserID, 0, "getResponseWithOpenAI()", err)
	} else {
		fmt.Println("[DEBUG] request to OpenAI has been created and ready to be sent")
		fmt.Printf("[DEBUG] request data: %s\n", string(body))
		resp = makeRequest(r.UserID, body)
		bb, err = io.ReadAll(resp.Body)
		if err != nil {
			fmt.Println("[DEBUG] can't read the response data")
			errorHandler(r.UserID, 1, "getResponseWithOpenAI()", err)
		} else {
			fmt.Println("[DEBUG] got response from OpenAI")
			fmt.Printf("[DEBUG] response data: %s\n", string(bb))
			err = json.Unmarshal(bb, op)
			if err != nil {
				fmt.Println("[DEBUG] can't convert response data into a go-stucture")
				errorHandler(r.UserID, 2, "getResponseWithOpenAI()", err)
			} else {
				if err := json.Unmarshal([]byte(op.Choices[0].Message.Content), &data); err != nil {
					fmt.Println("[DEBUG] can't convert a string response into a go-stucture")
					errorHandler(r.UserID, 4, "getResponseWithOpenAI()", err)
				} else {
					fmt.Println("[DEBUG] the response is valid")
					if data.Error != "" {
						fmt.Println("[DEBUG] the input is meaningless or nonsense")
						ok = true
					} else {
						ok, err = isResponseValid(&data, r)
						if err != nil {
							errorHandler(r.UserID, 5, "getResponseWithOpenAI()", err)
						}
					}
					if ok {
						updateDB(r.UserID, &CompleteStream{
							ID:           op.ID,
							Object:       op.Object,
							Created:      op.Created,
							Model:        op.Model,
							FinishReason: "done",
							Text:         op.Choices[0].Message.Content,
						})
					}
				}
			}
		}
	}
	return &data, err
}

func streamWithOpenAI(r *Request) {
	defer close(r.Stream)
	var resp *http.Response
	l := Languages[r.Lang]
	openai := &OpenAIReq{
		Model: l[1],
		Messages: []*message{
			{Role: "assistant", Content: fmt.Sprintf(promtV1, l[0], l[0], l[0], l[0], l[0], l[0], l[0])},
			{Role: "user", Content: r.Text}},
		Stream:      true,
		Temperature: 0.0,
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

func handleFirstImpression(req *Request, ip string) {
	if req.UserID == 0 || newUser(req.UserID) {
		fmt.Printf("[DEBUG] user {%d} hasn't been found\n", req.UserID)
		req.UserID = addUser(req.Lang, ip)
		fmt.Printf("[DEBUG] user {%d} has been added\n", req.UserID)
	} else {
		fmt.Printf("[DEBUG] user {%d} has been found\n", req.UserID)
		increment(req.UserID)
		fmt.Printf("[DEBUG] user's {%d} attempts have been incremented\n", req.UserID)
	}
}

func OneWord(req *Request, ip string) (*TranslationResponse, error) {
	handleFirstImpression(req, ip)
	return getResponseWithOpenAI(req)
}

func Stream(req *Request, ip string) {
	handleFirstImpression(req, ip)
	isDefaultLanguage(req)
	streamWithOpenAI(req)
}

func ChangeLanguage(req *Request, ip string) error {
	handleFirstImpression(req, ip)

	_, err := Db.Exec("UPDATE Users SET language = $1, is_chosen = 1 WHERE id = $2", req.Lang, req.UserID)
	if err != nil {
		errorHandler(req.UserID, 0, "ChangeLanguage()", err)
	} else {
		fmt.Printf("[DEBUG] user's {%d} language {%s} has been successfuly changed\n", req.UserID, req.Lang)
	}
	return err
}
