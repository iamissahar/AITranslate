include .env
export

net:
	docker network create ai_translate-network

build.app:
	docker build -f Dockerfile.app -t ai_translate .

build.db:
	docker build -f Dockerfile.db -t ai_translate-postgres .

run.app:
	docker run -d --rm --name ai_translate-container \
	--network ai_translate-network \
	-v /etc/letsencrypt/live/nathanissahar.me/fullchain.pem:/certs/fullchain.pem:ro \
  	-v /etc/letsencrypt/live/nathanissahar.me/privkey.pem:/certs/privkey.pem:ro \
	-p 988:988 \
	-e host_db=st-postgres-container \
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
	ai_translate

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
	docker run -d --rm --name ai_translate-container \
	--network ST-network \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_DB=postgres \
	-v ./postgres/create.sql:/docker-entrypoint-initdb.d/c \
	-v ./pgdata:/var/lib/postgresql/data \
	ai_translate


del.db:
	docker stop ai_translate-container
	sudo rm -rf ./pgdata

del.app:
	docker stop ai_translate-container
	docker rm ai_translate-container

reboot:
	docker stop ai_translate-container
	docker rm ai_translate-container
	docker build -f Dockerfile.app -t ai_translate .
	docker run -d --name ai_translate-container \
	--network ai_translate-network \
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
