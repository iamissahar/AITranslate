package main

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	app "github.com/iamissahar/AITranslate"
	"github.com/iamissahar/AITranslate/storage"
	"gopkg.in/gomail.v2"
)

const EMAIL_JSON string = "{\n\t\"user_id\": %d,\n\t\"error_id\": %d,\n\t\"function\": %q,\n\t\"error\": %q\n}"

func emailNotifier(userID, errid int, f string, err error) {
	message := fmt.Sprintf(EMAIL_JSON, userID, errid, f, err.Error())
	m := gomail.NewMessage()
	m.SetHeader("From", os.Getenv("email_from"))
	m.SetHeader("To", os.Getenv("email_to"))
	m.SetHeader("Subject", "!!WARNING!! AI Translate Backend ERROR!")
	m.SetBody("text/html", message)
	fmt.Println(message)
	d := gomail.NewDialer(os.Getenv("email_host"), 587, os.Getenv("email_from"), os.Getenv("email_password"))
	err = d.DialAndSend(m)
	if err != nil {
		fmt.Print(err)
	}
}

// func approveRequest(ctx *gin.Context, withText bool) (*app.Request, bool) {
// 	req := new(app.Request)
// 	err := ctx.ShouldBindJSON(req)
// 	if err != nil {
// 		fmt.Println("[DEBUG] input data invalid. can't recognize the json data from request")
// 		ctx.Header("Content-Type", "application/json")
// 		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 	} else {
// 		if withText {
// 			if req.Text == "" {
// 				fmt.Println("[DEBUG] input data invalid. text has to be not empty")
// 				ctx.Header("Content-Type", "application/json")
// 				ctx.JSON(http.StatusBadRequest, gin.H{"error": "not enough parameters. text parameter is required"})
// 				return nil, false
// 			}
// 		}

// 		if _, ok := app.Languages[req.Lang]; !ok {
// 			fmt.Println("[DEBUG] input data invalid. lang_code has to be in the variable Languages")
// 			ctx.Header("Content-Type", "application/json")
// 			ctx.JSON(http.StatusBadRequest, gin.H{"error": "not enough parameters. lang_code parameter is required"})
// 		}
// 	}
// 	return req, err == nil
// }

// func oneWord(router *gin.Engine) {
// 	router.POST("/translate/one_word", func(ctx *gin.Context) {
// 		if req, ok := approveRequest(ctx, true); ok {

// 			fmt.Println("[DEBUG] server has caught a request to translate one word")
// 			ctx.Header("Content-Type", "application/json")

// 			tr, err := app.OneWord(req, ctx.ClientIP())
// 			if err == nil {
// 				fmt.Println("[DEBUG] everything was OK. Server has got response from OpenAI and ready to send it to the client")
// 				ctx.JSON(http.StatusOK, gin.H{"user_id": req.UserID, "content": tr})
// 			} else {
// 				msg := err.Error()
// 				fmt.Println("[DEBUG] got an error during the server's process: ", msg)
// 				ctx.JSON(http.StatusBadRequest, gin.H{"description": "something went wrong on the server's side", "error": msg})
// 			}
// 		}
// 	})
// }

// func stream(router *gin.Engine) {
// 	router.POST("/translate/phrase", func(ctx *gin.Context) {
// 		if req, ok := approveRequest(ctx, true); ok {

// 			fmt.Println("[DEBUG] server's stream begins")
// 			req.Stream = make(chan *app.Response)
// 			go app.Stream(req, ctx.ClientIP())

// 			ctx.Header("Content-Type", "text/event-stream")
// 			ctx.Header("Cache-Control", "no-cache")
// 			ctx.Header("Connection", "keep-alive")
// 			ctx.Stream(func(w io.Writer) bool {
// 				var (
// 					peace *app.Response
// 					ok    bool
// 				)
// 				if peace, ok = <-req.Stream; ok {
// 					ctx.SSEvent("data", peace)
// 				} else {
// 					re := regexp.MustCompile(`\s+`)
// 					clean := re.ReplaceAllString(*req.FinalRes, " ")
// 					ctx.SSEvent("final_data", gin.H{"user_id": req.UserID, "final_text": clean})
// 					fmt.Println("[DEBUG] server's stream ends")
// 				}
// 				return ok
// 			})
// 		}
// 	})
// }

// func changeTheLanguage(router *gin.Engine) {
// 	router.PATCH("/change_language", func(ctx *gin.Context) {
// 		var err error
// 		req := new(app.Request)
// 		if err = ctx.ShouldBindJSON(req); err != nil {
// 			fmt.Println("[DEBUG] input data invalid")
// 			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		}
// 		if _, ok := app.Languages[req.Lang]; !ok {
// 			fmt.Println("[DEBUG] language code invalid")
// 			ctx.JSON(http.StatusBadRequest, gin.H{"code": "invalid input parameters", "error": "not enough parameters. lang_code isn't supported"})
// 		} else {
// 			if err = app.ChangeLanguage(req, ctx.ClientIP()); err != nil {
// 				fmt.Println("[DEBUG] server's error")
// 				ctx.JSON(http.StatusBadRequest, gin.H{"code": "server error", "error": err.Error()})
// 			} else {
// 				fmt.Println("[DEBUG] server's response has been successfuly created and ready to be sent")
// 				ctx.JSON(http.StatusOK, gin.H{"user_id": req.UserID, "message": "the langauge has been changed"})
// 			}
// 		}
// 	})
// }

// func stream(router *gin.Engine) {
// 	router.POST("/translate", func(ctx *gin.Context) {
// 		var (
// 			err error
// 			req = new(app.Request)
// 		)
// 		if err = ctx.ShouldBindJSON(req); err != nil {
// 			fmt.Println("[DEBUG] input data invalid")
// 			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		}

// 		if _, ok := app.Languages[req.Lang]; ok && req.Text != "" && err == nil {
// 			fmt.Println("[DEBUG] server's stream begins")
// 			req.Stream = make(chan *app.Response)
// 			go app.Mainlogic(req, ctx.ClientIP())

// 			ctx.Stream(func(w io.Writer) bool {
// 				var (
// 					peace *app.Response
// 					js    *app.OneWordResponse
// 					ok    bool
// 				)

// 				go func() {
// 					ctx.Header("Content-Type", "text/event-stream")
// 					ctx.Header("Cache-Control", "no-cache")
// 					ctx.Header("Connection", "keep-alive")
// 					if peace, ok = <-req.Stream; ok {
// 						ctx.SSEvent("data", peace)
// 					} else {
// 						if req.FinalRes != nil && *(req).FinalRes != "" {
// 							ctx.SSEvent("final_data", gin.H{"user_id": req.UserID, "final_text": req.FinalRes})
// 							fmt.Println("[DEBUG] server's stream ends")
// 						}
// 					}
// 				}()

// 				func() {
// 					ctx.Header("Content-Type", "application/json")
// 					if js, ok = <-req.OneWord; ok {
// 						ctx.JSON(http.StatusOK, js)
// 					}
// 				}()

// 				return ok
// 			})

// 		} else if err == nil {
// 			fmt.Println("[DEBUG] input data invalid. lang_code has to be in the variable Languages. Text has to be not empty")
// 			ctx.JSON(http.StatusBadRequest, gin.H{"error": "not enough parameters. has to be language code, text and user id"})
// 		}
// 	})
// }

func startAPI() {
	var (
		router *gin.Engine
		api    *API
		s      *storage.Storage
	)
	router = gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			fmt.Println(">> Origin:", origin)
			return origin == "chrome-extension://fplemnpbglnainedjaimekcgdkikkafc" || origin == "chrome-extension://blcdghlkkelnjabklhgoenenkefifoeo"
		},
		AllowMethods:     []string{"GET", "POST", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * 3600,
	}))
	//old version
	// stream(router)
	// changeTheLanguage(router)
	// oneWord(router)
	//new version
	api = new(API)
	s = new(storage.Storage)
	s.Init(app.Db, emailNotifier)
	api.Init(s)
	router.POST("/ai_translate/v2/translate/get_stream", api.getStream)
	router.POST("/ai_translate/v2/translate/get_json", api.getJson)
	router.PATCH("/ai_translate/v2/translate/deepl", api.getDeeplTranslation)
	//tests
	router.POST("/test/ai_translate/v2/translate/get_stream", api.getStream)
	router.POST("/test/ai_translate/v2/translate/get_json", api.getJson)
	router.PATCH("/test/ai_translate/v2/translate/deepl", api.getDeeplTranslation)
	// for tests
	err := router.Run(":4222")
	if err != nil {
		panic(err)
	}
	// for work
	// err = router.Run(":4200")
	// if err != nil {
	// panic(err)
	// }
}

func main() {
	startAPI()
}

func init() {
	var err error
	psqlconn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("host_db"), os.Getenv("port_db"), os.Getenv("user_db"),
		os.Getenv("password_db"), os.Getenv("dbname_db"), os.Getenv("sslmode_db"))
	app.Db, err = sql.Open("postgres", psqlconn)
	if err != nil {
		panic(err)
	}

	if err = app.Db.Ping(); err != nil {
		panic(err)
	}
}
