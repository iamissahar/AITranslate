venv:
	python -m venv .venv

active:
	source .venv/bin/activate

build.db:
	docker build -f Dockerfile.db -t st-postgres .

run.db:
	docker run -d --rm --name st-postgres-container \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_DB=postgres \
	-v ./postgres/create.sql:/docker-entrypoint-initdb.d/c \
	-v ./pgdata:/var/lib/postgresql/data \
	-p 5432:5432 \
	st-postgres

del.db:
	docker stop st-postgres-container
	sudo rm -rf ./pgdata

db.logs:
	docker logs st-postgres-container

test:
	host=localhost \
	port=5432 \
	user=postgres \
	password=postgres \
	dbname=postgres \
	sslmode=disable \
	python -m unittest main_test.$(class)

pytest:
	host=localhost \
	port=5432 \
	user=postgres \
	password=postgres \
	dbname=postgres \
	sslmode=disable \
	pytest main_test.py -v -k $(def)

pytest.all:
	host=localhost \
	port=5432 \
	user=postgres \
	password=postgres \
	dbname=postgres \
	sslmode=disable \
	pytest -v --asyncio-mode=auto

psql:
	docker exec -it st-postgres-container psql -U postgres
