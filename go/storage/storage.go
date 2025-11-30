package storage

import (
	"database/sql"
	"fmt"
)

type Storage struct {
	db       *sql.DB
	recovery func(userID, errid int, f string, err error)
}

func (s *Storage) Init(db *sql.DB, recovery func(userID, errid int, f string, err error)) {
	s.db = db
	s.recovery = recovery
}

func (s *Storage) IsNewUser(userID int) bool {
	var (
		amount int
		res    bool = true
		err    error
	)
	if s.db != nil {
		if userID != 0 {
			err = s.db.QueryRow("SELECT COUNT(*) FROM UsersV2 WHERE id = $1", userID).Scan(&amount)
			if err != nil {
				s.recovery(userID, 1, "storage.IsNewUser(userID int) bool", err)
			} else {
				res = amount == 0
			}
		}
	} else {
		s.recovery(userID, 0, "storage.IsNewUser(userID int) bool", fmt.Errorf("s.db is nil"))
	}
	return res
}

func (s *Storage) NewUser() int {
	var (
		userID int
		err    error
	)
	if s.db != nil {
		err = s.db.QueryRow("SELECT nextval('usersv2_id_seq')").Scan(&userID)
		if err != nil {
			s.recovery(userID, 1, "storage.NewUser(lang string) int", err)
		} else {
			_, err = s.db.Exec("INSERT INTO UsersV2 (id) VALUES ($1)", userID)
			if err != nil {
				s.recovery(userID, 2, "storage.NewUser(lang string) int", err)
			}
		}
	} else {
		s.recovery(userID, 0, "storage.NewUser(lang string) int", fmt.Errorf("s.db is nil"))
	}
	return userID
}

func (s *Storage) UpdateUserData(userID int, lang string) {
	var (
		storagelang string
		err         error
	)

	if s.db != nil {
		err = s.db.QueryRow("SELECT language FROM UsersV2 WHERE id = $1", userID).Scan(&storagelang)
		if err != nil {
			s.recovery(userID, 1, "storage.UpdateUserData(userID int, lang string)", err)
		} else {
			if storagelang != lang {
				_, err = s.db.Exec("UPDATE UsersV2 SET language = $1 WHERE id = $2", lang, userID)
				if err != nil {
					s.recovery(userID, 2, "storage.UpdateUserData(userID int, lang string)", err)
				}
			}

			if err == nil {
				_, err = s.db.Exec("UPDATE UsersV2 SET last_time_used = CURRENT_TIMESTAMP, used = used + 1 WHERE id = $1", userID)
				if err != nil {
					s.recovery(userID, 3, "storage.UpdateUserData(userID int, lang string)", err)
				}
			}
		}
	} else {
		s.recovery(userID, 0, "storage.UpdateUserData(userID int, lang string)", fmt.Errorf("s.db is nil"))
	}
}

func (s *Storage) ChangeLanguage(userID int, lang string) {
	var err error
	if s.db != nil {
		_, err = s.db.Exec("UPDATE UsersV2 SET language = $1, is_chosen = 1 WHERE id = $2", lang, userID)
		if err != nil {
			s.recovery(userID, 1, "storage.ChangeLanguage(userID int, lang string)", err)
		}
	} else {
		s.recovery(userID, 0, "storage.ChangeLanguage(userID int, lang string)", fmt.Errorf("s.db is nil"))
	}
}

func (s *Storage) UpdateDB(userID int, payload string) {
	var err error
	if s.db != nil {
		_, err = s.db.Exec("INSERT INTO ResponsesV2 (user_id, payload) VALUES ($1, $2)", userID, payload)
		if err != nil {
			s.recovery(userID, 1, "storage.UpdateDB(userID int, payload string)", err)
		}
	} else {
		s.recovery(userID, 0, "storage.UpdateDB(userID int, payload string)", fmt.Errorf("s.db is nil"))
	}
}
