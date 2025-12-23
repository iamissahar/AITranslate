net:
	docker network create ai_translate_network

build.app:
	docker build -f Dockerfile.app -t ai_translate .

build.db:
	docker build -f Dockerfile.db -t ai_translate_postgres .
