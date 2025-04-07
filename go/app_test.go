package app

import (
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

const (
	ip   string = "178.99.312.65"
	lang string = "en"
)

var (
	userID int
	stch   = StreamChunk{
		ID:      "AKDSKASKDAKASDsdasdaDasl;dL:SDL:asASD",
		Object:  "stream-chunk",
		Created: time.Now().Unix(),
		Model:   "gpt-4o",
		Choices: []*choice{{
			Delta: &delta{Content: "It's just a part of text"},
			Index: 2,
		}},
	}
	req = Request{
		UserID: 1231231,
		Lang:   "ru",
		Text:   "Угадай-ка вот это!",
	}
)

func delUser(t *testing.T) {
	_, err := Db.Exec("DELETE FROM Users WHERE id = $1", userID)
	if err != nil {
		t.Fatal(err)
	}
}

func resetSeq(t *testing.T) {
	_, err := Db.Exec("ALTER SEQUENCE users_id_seq RESTART WITH 1")
	if err != nil {
		t.Fatal(err)
	}
}

func cleanAll(t *testing.T) {
	delUser(t)
	_, err := Db.Exec("DELETE FROM Content WHERE content_index = $1 AND response_id = $2", stch.Choices[0].Index, stch.ID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = Db.Exec("DELETE FROM Responses WHERE id = $1", stch.ID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = Db.Exec("DELETE FROM Relations WHERE user_id = $1 AND response_id = $2 AND content_index = $3", userID, stch.ID, stch.Choices[0].Index)
	if err != nil {
		t.Fatal(err)
	}
	resetSeq(t)
}

func createUser(t *testing.T) {
	err := Db.QueryRow("SELECT nextval('users_id_seq')").Scan(&userID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = Db.Exec("INSERT INTO Users (id, ip, attempts, language) VALUES ($1, $2, 1, $3)", userID, ip, lang)
	if err != nil {
		t.Fatal(err)
	}
}

func checkIncrement(t *testing.T) int {
	var res int
	err := Db.QueryRow("SELECT attempts FROM Users WHERE id = $1", userID).Scan(&res)
	if err != nil {
		t.Fatal(err)
	}
	return res
}

func checkResponses(t *testing.T) bool {
	var res int
	err := Db.QueryRow("SELECT COUNT(*) FROM Responses WHERE id = $1 AND time_creation = $2 AND model = $3",
		stch.ID, time.Unix(stch.Created, 0), stch.Model).Scan(&res)
	if err != nil {
		t.Fatal(err)
	}
	return res == 1
}

func checkContent(t *testing.T) bool {
	var res int
	err := Db.QueryRow("SELECT COUNT(*) FROM Content WHERE content_index = $1 AND response_id = $2 AND object = $3 AND text = $4",
		stch.Choices[0].Index, stch.ID, stch.Object, stch.Choices[0].Delta.Content).Scan(&res)
	if err != nil {
		t.Fatal(err)
	}
	return res == 1
}

func checkRelations(t *testing.T) bool {
	var res int
	err := Db.QueryRow("SELECT COUNT(*) FROM Relations WHERE user_id = $1 AND response_id = $2 AND content_index = $3",
		userID, stch.ID, stch.Choices[0].Index).Scan(&res)
	if err != nil {
		t.Fatal(err)
	}
	return res == 1
}

func TestNewUser(t *testing.T) {
	defer delUser(t)

	assert.Equal(t, newUser(userID), false, "the result from it should be false")
	assert.NotEqual(t, newUser(userID), true, "the result from it should be false")

	createUser(t)

	assert.Equal(t, newUser(userID), true, "the result from it should be true")
	assert.NotEqual(t, newUser(userID), false, "the result from it should be true")
}

func TestAddUser(t *testing.T) {
	defer delUser(t)
	defer resetSeq(t)

	assert.Equal(t, addUser(lang, ip), 1, "the result should be 1")
}

func TestIncrement(t *testing.T) {
	defer delUser(t)
	defer resetSeq(t)

	createUser(t)
	increment(userID)
	assert.Equal(t, checkIncrement(t), 2, "the result should be 2")
}

func TestUpdateDB(t *testing.T) {
	defer cleanAll(t)
	createUser(t)

	updateDB(userID, stch)
	assert.Equal(t, checkResponses(t), true, "the result should be true")
	assert.Equal(t, checkContent(t), true, "the result should be true")
	assert.Equal(t, checkRelations(t), true, "the result should be true")
}

func respFromOpanAI(_ int, chunk StreamChunk, _ *gin.Context) {
	fmt.Println(chunk)
	fmt.Println(chunk.Choices)
	fmt.Println(chunk.Choices[0])
	fmt.Println(chunk.Choices[0].Delta)
}

func TestCallOpenAI(t *testing.T) {
	callOpenAI(req, respFromOpanAI, nil)
}

func init() {
	var err error
	psqlconn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("host_db"), os.Getenv("port_db"), os.Getenv("user_db"),
		os.Getenv("password_db"), os.Getenv("dbname_db"), os.Getenv("sslmode_db"))
	Db, err = sql.Open("postgres", psqlconn)
	if err != nil {
		panic(err)
	}

	if err = Db.Ping(); err != nil {
		panic(err)
	}
}
