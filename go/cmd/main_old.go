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
	d := gomail.NewDialer(os.Getenv("email_host"), 587, os.Getenv("email_from"), os.Getenv("email_password"))
	err = d.DialAndSend(m)
	if err != nil {
		fmt.Print(err)
	}
}

func startAPI() {
	var (
		router *gin.Engine
		api    *API
		s      *storage.Storage
	)
	router = gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
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
	// router.POST("/ai_translate/v2/translate/get_stream", api.getStream)
	// router.POST("/ai_translate/v2/translate/get_json", api.getJson)
	// router.PATCH("/ai_translate/v2/translate/deepl", api.getDeeplTranslation)
	//tests
	router.POST("/ai_translate/v2.1/translate/get_stream", api.getStream)
	router.POST("/ai_translate/v2.1/translate/get_json", api.getJson)
	router.POST("/ai_translate/v2.1/translate/deepl", api.getDeeplTranslation)
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
