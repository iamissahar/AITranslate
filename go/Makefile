net:
	docker network create ai_translate_network

build.app:
	docker build -f Dockerfile.app -t ai_translate .

build.db:
	docker build -f Dockerfile.db -t ai_translate_postgres .

app.logs:
	docker service logs ai_translate_stack_ai_translate

deploy:
	docker stack deploy -c docker-compose.yml ai_translate_stack

delete:
	docker stack rm ai_translate_stack

status:
	docker service ps ai_translate_stack_ai_translate
