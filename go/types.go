package app

import (
	"database/sql"
	"os"
)

const (
	promtV1 string = `
Translate the following text into %s [target language].
Return only the translated text, nothing else.
Do not include any explanations, comments, or formatting — just plain translated text.
`
	promtV2 string = `
You must take the text from the user.
You must provide at least once and up to five:
	1. part of speech
	2. context 
	3. literal translation 
	4. usage example in
Everything must be in %s, everything must not be the same.
You must put the data you got in JSON. You must return only valid JSON. Every json field must not be empty.
The expected JSON format: {"part_of_speech": "", "meanings": [{"context": "", "translation": "","example": ""}, ...]}`

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
	FinalRes *string `json:"final_text"`
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
	ID      string      `json:"id"`
	Object  string      `json:"object"`
	Created int64       `json:"created"`
	Model   string      `json:"model"`
	Choices []*choiceV1 `json:"choices"`
	Error   *streamErr  `json:"error"`
}

type CompleteStream struct {
	ID           string
	Object       string
	Created      int64
	Model        string
	FinishReason string
	Text         string
}

type choiceV1 struct {
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

type choiceV2 struct {
	Message *message
}

type OpenAI struct {
	ID      string     `json:"id"`
	Object  string     `json:"object"`
	Created int64      `json:"created"`
	Model   string     `json:"model"`
	Choices []choiceV2 `json:"choices"`
}
