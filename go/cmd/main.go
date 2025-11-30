package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	app "github.com/iamissahar/AITranslate"
	"github.com/iamissahar/AITranslate/storage"
)

type API struct {
	s *storage.Storage
}

type Request struct {
	UserID *int   `json:"user_id"`
	Target string `json:"target_lang"`
	Source string `json:"source_lang,omitempty"`
	Text   string `json:"text"`
}

type event struct {
	ch  chan string
	ctx *gin.Context
}

func (api *API) Init(s *storage.Storage) {
	api.s = s
}

func (api *API) isDataRelevant(req *Request, ctx *gin.Context, withText bool) bool {
	var (
		ok  bool = true
		err error
	)

	err = ctx.ShouldBindJSON(req)
	ok = err == nil
	if !ok {
		ctx.Data(http.StatusBadRequest, "application/json", []byte(fmt.Sprintf(app.ERROR_JSON, app.INVALID_PARAMETERS, err.Error())))
	} else {
		ok = !withText || req.Text != ""
		if !ok {
			ctx.Data(http.StatusBadRequest, "application/json", []byte(fmt.Sprintf(app.ERROR_JSON, app.INVALID_PARAMETERS, "'text' parameter is required")))
		}

		if ok {
			_, ok = app.Languages[req.Target]
			if !ok {
				ctx.Data(http.StatusBadRequest, "application/json", []byte(fmt.Sprintf(app.ERROR_JSON, app.INVALID_PARAMETERS, "valid 'target_lang' parameter is required")))
			} else {
				if req.Source != "" {
					_, ok = app.Languages[req.Source]
					if !ok {
						ctx.Data(http.StatusBadRequest, "application/json", []byte(fmt.Sprintf(app.ERROR_JSON, app.INVALID_PARAMETERS, "valid 'source_lang' parameter is required, if any")))
					}
				}
			}
		}
	}
	return ok
}

func (e *event) step(w io.Writer) bool {
	var (
		chunk string
		ok    bool
	)
	if chunk, ok = <-e.ch; ok {
		if bytes.HasPrefix([]byte(chunk), []byte("{\"ok\": false,")) {
			fmt.Println("\033[34m[DEBUG]\033[0m ", chunk)
			e.ctx.Data(http.StatusInternalServerError, "application/json", []byte(chunk))
		} else {
			fmt.Println("\033[34m[DEBUG]\033[0m sending chunk to client")
			fmt.Println("\033[34m[DEBUG]\033[0m ", chunk)
			e.ctx.SSEvent("data", chunk)
		}
	}
	return ok
}

func (api *API) begin(req *Request, trsl app.Translator, ctx *gin.Context, e *event, deepl bool) {
	var (
		res  string
		code int
		err  error
	)
	if api.isDataRelevant(req, ctx, true) {
		fmt.Println("data is relevant")
		app.CheckUserData(api.s, req.UserID)
		if e != nil {
			fmt.Println("user data is allright start streaming")
			go trsl.Do(*req.UserID, "", req.Target, req.Text)
			ctx.Stream(e.step)
		} else {
			if !deepl {
				fmt.Println("user data is allright start getting html data")
				res, err = trsl.Do(*req.UserID, "", req.Target, req.Text)
			} else {
				fmt.Println("user data is allright start getting deepl translation")
				res, err = trsl.Do(*req.UserID, req.Source, req.Target, req.Text)
			}
			if err != nil {
				code = http.StatusInternalServerError
			} else {
				code = http.StatusOK
			}
			fmt.Println("going to send the response: ", res)
			ctx.Data(code, "application/json", []byte(res))

		}
	}
}

func (api *API) getStream(ctx *gin.Context) {
	var (
		req      = new(Request)
		streamer = new(app.Streamer)
		e        = new(event)
	)
	fmt.Println("Hey! Now, it's a stream")
	e.ch = make(chan string)
	e.ctx = ctx
	streamer.Init(e.ch, api.s)
	api.begin(req, streamer, ctx, e, false)
}

func (api *API) getJson(ctx *gin.Context) {
	var (
		req    = new(Request)
		jsoner = new(app.Jsoner)
	)
	jsoner.Init(api.s)
	api.begin(req, jsoner, ctx, nil, false)
}

func (api *API) getDeeplTranslation(ctx *gin.Context) {
	var (
		req   = new(Request)
		deepl = new(app.Deepl)
	)
	deepl.Init(api.s)
	api.begin(req, deepl, ctx, nil, true)
}
