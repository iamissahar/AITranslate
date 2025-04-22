package main

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	app "github.com/iamissahar/AITranslate"
)

func changeTheLanguage(router *gin.Engine) {
	router.PATCH("/change_language", func(ctx *gin.Context) {
		var err error
		req := new(app.Request)
		if err = ctx.ShouldBindJSON(req); err != nil {
			fmt.Println("[DEBUG] input data invalid")
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		if _, ok := app.Languages[req.Lang]; !ok {
			fmt.Println("[DEBUG] language code invalid")
			ctx.JSON(http.StatusBadRequest, gin.H{"code": "invalid input parameters", "error": "not enough parameters. lang_code isn't supported"})
		} else {
			if err = app.ChangeLanguage(req, ctx.ClientIP()); err != nil {
				fmt.Println("[DEBUG] server's error")
				ctx.JSON(http.StatusBadRequest, gin.H{"code": "server error", "error": err.Error()})
			} else {
				fmt.Println("[DEBUG] server's response has been successfuly created and ready to be sent")
				ctx.JSON(http.StatusOK, gin.H{"user_id": req.UserID, "message": "the langauge has been changed"})
			}
		}
	})
}

func stream(router *gin.Engine) {
	router.POST("/translate", func(ctx *gin.Context) {
		var (
			err error
			req = new(app.Request)
		)
		if err = ctx.ShouldBindJSON(req); err != nil {
			fmt.Println("[DEBUG] input data invalid")
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}

		if _, ok := app.Languages[req.Lang]; ok && req.Text != "" && err == nil {
			fmt.Println("[DEBUG] server's stream begins")
			req.Stream = make(chan *app.Response)
			go app.Mainlogic(req, ctx.ClientIP())

			ctx.Stream(func(w io.Writer) bool {
				var (
					peace *app.Response
					js    *app.OneWordResponse
					ok    bool
				)

				go func() {
					ctx.Header("Content-Type", "text/event-stream")
					ctx.Header("Cache-Control", "no-cache")
					ctx.Header("Connection", "keep-alive")
					if peace, ok = <-req.Stream; ok {
						ctx.SSEvent("data", peace)
					} else {
						if req.FinalRes != nil && *(req).FinalRes != "" {
							ctx.SSEvent("final_data", gin.H{"user_id": req.UserID, "final_text": req.FinalRes})
							fmt.Println("[DEBUG] server's stream ends")
						}
					}
				}()

				func() {
					ctx.Header("Content-Type", "application/json")
					if js, ok = <-req.OneWord; ok {
						ctx.JSON(http.StatusOK, js)
					}
				}()

				return ok
			})

		} else if err == nil {
			fmt.Println("[DEBUG] input data invalid. lang_code has to be in the variable Languages. Text has to be not empty")
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "not enough parameters. has to be language code, text and user id"})
		}
	})
}

func startAPI() {
	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			fmt.Println(">> Origin:", origin)
			return origin == "chrome-extension://fplemnpbglnainedjaimekcgdkikkafc"
		},
		AllowMethods:     []string{"GET", "POST", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * 3600,
	}))
	stream(router)
	changeTheLanguage(router)
	err := router.RunTLS(":443", "/certs/fullchain.pem", "/certs/privkey.pem")
	if err != nil {
		panic(err)
	}
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
