package main

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	app "github.com/iamissahar/SmartTranslation"
)

func startAPI() {
	router := gin.Default()
	router.POST("/translate/", func(ctx *gin.Context) {
		var (
			err error
			req = new(app.Request)
		)

		if err = ctx.ShouldBindJSON(req); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}

		if req.Lang != "" && req.Text != "" {
			req.Stream = make(chan *app.Response)
			go app.Mainlogic(req, ctx)

			ctx.Stream(func(w io.Writer) bool {
				var (
					peace *app.Response
					ok    bool
				)
				if peace, ok = <-req.Stream; ok {
					ctx.SSEvent("data", peace)
				}
				return ok
			})

		} else {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "not enough parameters. has to be language code, text and user id"})
		}
	})
	router.Run(":8080")
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
