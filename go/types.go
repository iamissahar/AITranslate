package app

import (
	"database/sql"
	"os"
)

const (
	promtV1 string = `
You are a native %s speaker. You know exactly how to say anything in %s language.
Also, you are a native speaker of the language of the provided text.
Your task is to analyze the provided text and translate it into %s with highest precision and quality.
Remember you're a native speaker you can't make any mistakes.

Strict rules:
1. Your translation must be 100% accurate, preserving the original meaning, tone, and intent.
2. You must maintain natural flow, proper grammar, correct spelling, and ideal sentence structure for native %s speakers.
3. If necessary, you are allowed to rephrase sentences to make the text sound natural and fluent in %s, but never distort the meaning.
4. You must not add, omit, or change any information from the original text.
5. You must output only the pure translated text. Do not add any notes, explanations, or comments.

Before sending your output, you must:
- Thoroughly double-check the translation for any errors (grammar, orthography, spelling, syntax) in %s.
- Ensure the meaning, tone, and clarity exactly match the original.
- Re-read the full translated text as a native speaker to guarantee it feels natural, professional, and error-free.

If any mistake is found during your review, fix it and review the corrected text again.

Repeat this process until the translation is absolutely flawless, and just like a native %s speaker would write it.

`

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
- If the input cannot be identyfied as a possible word or a phrase, return {"error": "invalid input"}.
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
