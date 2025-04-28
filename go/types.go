package app

import (
	"database/sql"
	"os"
)

const (
	promtV1 string = `
You must act as a translator.
You must take the text from the user.
You must always respond only in %s language.
You must translate the text, being focused on %s's grammar, %s's the natural flow and %s's structure of the sentence.
You are allowed to change structure if needed.

Before outputting, double-check:
- The whole response in %s language.
- During translation you saved the meaning of the original text
- Everything has the natural flow, correct grammar, and structure of the senctence - all in %s language.
If any rule is broken - fix it automatically before sending.`

	promtV2 string = `
You must act as a strict JSON generator.

You must take the text from the user.
You must always respond only in %s language.

You must translate the user input into %s language.
You must not leave any part untranslated.

Return a valid JSON with the following fields:
{
  "part_of_speech": "",
  "meanings": [
    {
      "context": "",
      "translation": "",
      "example": ""
    }
  ]
}

Important rules:
- You must generate at least 1 and up to 5 meanings (different, common meanings) inside the "meanings" array.
- "part_of_speech", "context", "translation", and "example" must ALL be in %s language. No exceptions.
- The field "translation" must contain the %s translation of the user's input.
- No field must be empty.
- You must invent realistic context and example if necessary.
- If the input cannot be processed (nonsense, meaningless), return {"error": "invalid input"}.
- Only output the JSON. No extra text or comments.

Before outputting, double-check:
- meanings array must contain from 1 to 5 items.
- No field must be empty.
- All content must be in %s language.
- Output must be only valid JSON, without any explanation or extra text.
If any rule is broken — fix it automatically before sending.`

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
	PartOfSpeech string    `json:"part_of_speech,omitempty"`
	Meanings     []meaning `json:"meanings,omitempty"`
	Error        string    `json:"error,omitempty"`
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
