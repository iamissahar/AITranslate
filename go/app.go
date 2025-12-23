package app

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/iamissahar/AITranslate/storage"
	_ "github.com/lib/pq"
)

const (
	DEFAULT_JSON_WITH_STREAM         string = "{\"model\": %q, \"messages\": [{\"role\": \"developer\", \"content\": %q}, {\"role\": \"user\", \"content\": %q}], \"stream\": true, \"temperature\": 0.04}"
	DEFAULT_JSON_WITHOUT_STREAM      string = "{\"model\": %q, \"messages\": [{\"role\": \"developer\", \"content\": %q}, {\"role\": \"user\", \"content\": %q}]}"
	DEFAULT_OK_STREAM_CHUNK          string = "{\"ok\": true, \"result\": {\"user_id\": %d, \"text\": %q}}"
	DEFAULT_NOTOK_STREAM_CHUNK       string = "{\"ok\": true, \"result\": {\"user_id\": %d, \"finish_reason\": %q}}"
	DEFAULT_STREAM_ERROR             string = "{\"ok\": false, \"result\": {\"user_id\": %d, \"error\": \"Open AI has responsed in an unexpected way.\"}}"
	DEFAULT_ERROR                    string = "{\"ok\": false, \"result\": {\"user_id\": %d, \"code\": %q, \"error\": %q}}"
	DEFAULT_SUCCESS_JSON             string = "{\"ok\": true, \"result\": {\"user_id\": %d, \"status\": \"done\"}}"
	DEFAULT_SUCCESS_JSON_TRANSLATION string = "{\"ok\": true, \"result\": {\"user_id\": %d, \"text\": %q}}"
	COMPLETE_ACTION_JSON             string = "{\"id\": %q, \"object\": %q, \"created\" %d, \"model\": %q, \"finish_reason\": %q, \"text\": %q}"
	INTERNAL_SERVER_ERROR            string = "something went wrong on the service's side"
	JSON_PROMPT_PATH                 string = "json_prompt.txt"
	// JSON_PROMPT_PATH      string = "html_prompt.txt"
	TRANSLATE_PROMPT_PATH string = "translate_prompt.txt"
	CHAT_MODEL            string = "gpt-4.1-nano"
)

func getPayload(lang, text, path string) ([]byte, error) {
	var (
		f         *os.File
		filebytes []byte
		payload   []byte
		err       error
	)
	f, err = os.Open(path)
	if err == nil {
		filebytes, err = io.ReadAll(f)
		if err == nil {
			if path != JSON_PROMPT_PATH {
				payload = []byte(fmt.Sprintf(
					DEFAULT_JSON_WITH_STREAM,
					Languages[lang][1],
					fmt.Sprintf(string(filebytes), Languages[lang][0]),
					text),
				)
			} else {
				payload = []byte(fmt.Sprintf(
					DEFAULT_JSON_WITHOUT_STREAM,
					Languages[lang][1],
					fmt.Sprintf(string(filebytes), Languages[lang][0], Languages[lang][0], Languages[lang][0], Languages[lang][0], Languages[lang][0], Languages[lang][0], Languages[lang][0], Languages[lang][0], Languages[lang][0]),
					text,
				))
			}
		}
	}

	if f != nil {
		_ = f.Close()
	}
	return payload, err
}

func requestAI(payload []byte, url, token string) (*http.Response, error) {
	var (
		rq  *http.Request
		rs  *http.Response
		cl  http.Client
		err error
	)
	rq, err = http.NewRequest(http.MethodPost, url, bytes.NewBuffer(payload))
	rq.Header.Add("Content-Type", "application/json")
	rq.Header.Add("Authorization", token)
	if err == nil {
		rs, err = cl.Do(rq)
	}
	return rs, err
}

func saveStreamData(chunk *StreamChunk, cs *CompleteStream) {
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
}

func (str *Streamer) handleResponse(rs *http.Response, userID int) {
	var (
		reader *bufio.Reader
		line   []byte
		err    error
		data   string
		chunk  *StreamChunk
		choice *choiceV1
		isDone bool
		cs     = new(CompleteStream)
	)
	reader = bufio.NewReader(rs.Body)
	for !isDone {
		line, err = reader.ReadBytes('\n')
		if err != nil {
			if err != io.EOF {
				isDone = true
			}
		} else {
			if strings.HasPrefix(string(line), "data: ") {
				data = strings.TrimPrefix(string(line), "data: ")
				if len(data) > 6 && data[:6] == "[DONE]" {
					isDone = true
					str.s.UpdateDB(userID, fmt.Sprintf(COMPLETE_ACTION_JSON, cs.ID, cs.Object, int(cs.Created), cs.Model, "done", cs.Text))
				} else {
					chunk = new(StreamChunk)
					err = json.Unmarshal([]byte(data), chunk)
					if err == nil {
						saveStreamData(chunk, cs)
						for _, choice = range chunk.Choices {
							if choice != nil && choice.Delta != nil && choice.Delta.Content != "" && choice.FinishReason == nil {
								cs.Text += choice.Delta.Content
								str.ch <- fmt.Sprintf(DEFAULT_OK_STREAM_CHUNK, userID, choice.Delta.Content)
							} else if choice.FinishReason != nil {
								// str.ch <- fmt.Sprintf(DEFAULT_NOTOK_STREAM_CHUNK, userID, *choice.FinishReason)
							}
						}
					}
				}
			} else {
				// str.ch <- fmt.Sprintf(DEFAULT_STREAM_ERROR, userID)
			}
		}
	}

	_ = rs.Body.Close()
}

func (js *Jsoner) Init(s *storage.Storage) {
	js.s = s
}

func (js *Jsoner) handleResponse(rs *http.Response, userID int) string {
	var (
		op = new(OpenAI)
		// tr  TranslationResponse
		res string
		err error
	)
	err = json.NewDecoder(rs.Body).Decode(op)
	if err == nil {
		if len(op.Choices) > 0 && op.Choices[0].Message != nil {
			js.s.UpdateDB(userID, fmt.Sprintf(COMPLETE_ACTION_JSON, op.ID, op.Object, int(op.Created), op.Model, "done", op.Choices[0].Message.Content))
			res = fmt.Sprintf(DEFAULT_SUCCESS_JSON_TRANSLATION, userID, op.Choices[0].Message.Content)
		} else {
			res = fmt.Sprintf(DEFAULT_ERROR, userID, "invalid_response", "Open AI response is invalid")
		}
	} else {
		res = fmt.Sprintf(DEFAULT_ERROR, userID, "unable_to_unmarshal_json", err.Error())
	}

	_ = rs.Body.Close()
	return res
}

func CheckUserData(s *storage.Storage, userID *int) {
	if s.IsNewUser(*userID) {
		*userID = s.NewUser()
	}
}

func (str *Streamer) Init(ch chan string, s *storage.Storage) {
	str.ch = ch
	str.s = s
}

func (str *Streamer) Do(userID int, _, target, text string) (string, error) {
	var (
		payload []byte
		rs      *http.Response
		err     error
	)
	payload, err = getPayload(target, text, TRANSLATE_PROMPT_PATH)
	if err == nil {
		b, _ := os.ReadFile(os.Getenv("OPENAI_API_KEY"))
		rs, err = requestAI(payload, "https://api.openai.com/v1/chat/completions", "Bearer "+string(b))
		if err == nil {
			str.handleResponse(rs, userID)
		}
	}
	if err != nil {
		str.ch <- fmt.Sprintf(DEFAULT_ERROR, userID, INTERNAL_SERVER_ERROR, err.Error())
	}
	close(str.ch)
	return "", nil
}

func (js *Jsoner) Do(userID int, _, target, text string) (string, error) {
	var (
		payload []byte
		rs      *http.Response
		res     string
		err     error
	)
	payload, err = getPayload(target, text, JSON_PROMPT_PATH)
	if err == nil {
		b, _ := os.ReadFile(os.Getenv("OPENAI_API_KEY"))
		rs, err = requestAI(payload, "https://api.openai.com/v1/chat/completions", "Bearer "+string(b))
		if err == nil {
			res = js.handleResponse(rs, userID)
		}
	}
	return res, err
}

func (dl *Deepl) Init(s *storage.Storage) {
	dl.s = s
}

//	{
//	  "translations": [
//	    {
//	      "detected_source_language": "EN",
//	      "text": "Hallo, Welt!",
//	      "billed_characters": 42,
//	      "model_type_used": "quality_optimized"
//	    }
//	  ]
//	}
type translation struct {
	Source string `json:"detected_source_language"`
	Text   string `json:"text"`
}

type DeepLResponse struct {
	Translations []*translation `json:"translations"`
}

func (dl *Deepl) Do(userID int, source, target, text string) (string, error) {
	var (
		payload []byte
		rs      *http.Response
		dlrs    *DeepLResponse
		res     string
		err     error
	)

	if source != "auto" && source != "" {
		payload = []byte(fmt.Sprintf("{\"text\": [%q], \"target_lang\": %q, \"source_lang\": %q}", text, target, source))
	} else {
		payload = []byte(fmt.Sprintf("{\"text\": [%q], \"target_lang\": %q}", text, target))
	}

	b, _ := os.ReadFile(os.Getenv("DEEPL_AUTH_KEY"))
	rs, err = requestAI(payload, "https://api-free.deepl.com/v2/translate", "DeepL-Auth-Key "+string(b))
	if err == nil {
		dlrs = new(DeepLResponse)
		body, _ := io.ReadAll(rs.Body)
		fmt.Println(string(body))
		json.Unmarshal(body, dlrs)
		// err = json.NewDecoder(rs.Body).Decode(dlrs)
		if err == nil {
			if len(dlrs.Translations) > 0 {
				res = fmt.Sprintf("{\"ok\": true, \"result\": {\"user_id\": %d, \"source_lang\": %q, \"text\": %q}}", userID, strings.ToLower(dlrs.Translations[0].Source), dlrs.Translations[0].Text)
			} else {
				err = fmt.Errorf("{\"ok\": false, \"result\": {\"error\": \"invalid response from deepl api.\"}}")
			}
		}
	} else {
		err = fmt.Errorf("{\"ok\": false, \"result\": {\"error\": \"%s\"}}", err.Error())
	}
	return res, err
}
