include .env
export

net:
	docker network create ai_translate_v2-network

build.app:
	docker build -f Dockerfile.app -t ai_translate_v2 .

build.db:
	docker build -f Dockerfile.db -t ai_translate_v2-postgres .

run.app:
	docker run -d --name ai_translate_v2-container \
	--network ai_translate_v2-network \
	-v /etc/letsencrypt/live/nathanissahar.me/fullchain.pem:/certs/fullchain.pem:ro \
  	-v /etc/letsencrypt/live/nathanissahar.me/privkey.pem:/certs/privkey.pem:ro \
	-p 4222:4222 \
	-e host_db=ai_translate_v2-postgres-container \
	-e port_db=5432 \
	-e user_db=postgres \
	-e password_db=postgres \
	-e dbname_db=postgres \
	-e sslmode_db=disable \
	-e OPENAI_API_KEY=$(OPENAI_API_KEY) \
	-e email_from=$(email_from) \
	-e email_to=$(email_to) \
	-e email_password=$(email_password) \
	-e email_host=$(email_host) \
	-e DEEPL_AUTH_KEY=$(DEEPL_AUTH_KEY) \
	ai_translate_v2

rungo:
	host_db=localhost \
	port_db=5432 \
	user_db=postgres \
	password_db=postgres \
	dbname_db=postgres \
	sslmode_db=disable \
	-e OPENAI_API_KEY=$(OPENAI_API_KEY) \
	-e email_from=$(email_from) \
	-e email_to=$(email_to) \
	-e email_password=$(email_password) \
	-e email_host=$(email_host) \
	go run ./cmd

run.db:
	docker run -d --rm --name ai_translate_v2-postgres-container \
	--network ai_translate_v2-network \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_DB=postgres \
	-v ./postgres/create.sql:/docker-entrypoint-initdb.d/c \
	-v ./pgdata:/var/lib/postgresql/data \
	ai_translate_v2-postgres


del.db:
	docker stop ai_translate_v2-postgres-container
	sudo rm -rf ./pgdata

del.app:
	docker stop ai_translate_v2-container
	docker rm ai_translate_v2-container

reboot:
	docker stop ai_translate_v2-container
	docker rm ai_translate_v2-container
	docker build -f Dockerfile.app -t ai_translate_v2 .
	docker run -d --name ai_translate_v2-container \
	--network ai_translate_v2-network \
	-p 8080:8080 \
	-e host_db=st-postgres-container \
	-e port_db=5432 \
	-e user_db=postgres \
	-e password_db=postgres \
	-e dbname_db=postgres \
	-e sslmode_db=disable \
	trump-app

test:
	host_db=localhost \
	port_db=5432 \
	user_db=postgres \
	password_db=postgres \
	dbname_db=postgres \
	sslmode_db=disable \
	go test -v -run $(func)

psql:
	docker exec -it ai_translate-postgres-container psql -U postgres

logs:
	docker logs ai_translate-postgres-container

#--network ST-network
