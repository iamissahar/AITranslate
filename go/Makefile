net:
	docker network create ST-network

build.app:
	docker build -f Dockerfile.app -t st-app .

build.db:
	docker build -f Dockerfile.db -t st-postgres .

run.app:
	docker run -d --rm --name st-app-container \
	--network ST-network \
	-v /etc/letsencrypt/live/nathanissahar.me/fullchain.pem:/certs/fullchain.pem:ro \
  	-v /etc/letsencrypt/live/nathanissahar.me/privkey.pem:/certs/privkey.pem:ro \
	-p 443:443 \
	-e host_db=st-postgres-container \
	-e port_db=5432 \
	-e user_db=postgres \
	-e password_db=postgres \
	-e dbname_db=postgres \
	-e sslmode_db=disable \
	st-app

rungo:
	host_db=localhost \
	port_db=5432 \
	user_db=postgres \
	password_db=postgres \
	dbname_db=postgres \
	sslmode_db=disable \
	go run ./cmd

run.db:
	docker run -d --rm --name st-postgres-container \
	--network ST-network \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_DB=postgres \
	-v ./postgres/create.sql:/docker-entrypoint-initdb.d/c \
	-v ./pgdata:/var/lib/postgresql/data \
	st-postgres


del.db:
	docker stop st-postgres-container
	sudo rm -rf ./pgdata

del.app:
	docker stop st-app-container
	docker rm st-app-container

reboot:
	docker stop st-app-container
	docker rm st-app-container
	docker build -f Dockerfile.app -t st-app .
	docker run -d --name st-app-container \
	--network ST-network \
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
	docker exec -it st-postgres-container psql -U postgres

logs:
	docker logs st-postgres-container

#--network ST-network 