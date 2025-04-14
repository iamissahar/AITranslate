CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) DEFAULT '' NOT NULL,
    attempts INT DEFAULT 0  NOT NULL,
    language VARCHAR(10) DEFAULT '' NOT NULL,
    is_chosen INT DEFAULT 0 NOT NULL
);

CREATE TABLE Responses (
    id VARCHAR(256) PRIMARY KEY,
    time_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    model VARCHAR(25) DEFAULT '' NOT NULL
);

CREATE TABLE Content (
    id SERIAL PRIMARY KEY,
    response_id VARCHAR(256) NOT NULL,
    object VARCHAR(100) DEFAULT '' NOT NULL,
    text TEXT DEFAULT '' NOT NULL,
    finish_reason VARCHAR(256) DEFAULT '' NOT NULL,
    FOREIGN KEY (response_id) REFERENCES Responses(id) ON DELETE CASCADE,
    UNIQUE (response_id, id)
);

CREATE TABLE Relations (
    user_id INT REFERENCES Users(id) ON DELETE CASCADE,
    response_id VARCHAR(256) NOT NULL,
    content_id INT NOT NULL,
    PRIMARY KEY(user_id, response_id, content_id),
    FOREIGN KEY (response_id, content_id)
        REFERENCES Content(response_id, id)
        ON DELETE CASCADE
);