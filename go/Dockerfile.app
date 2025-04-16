FROM golang:1.23.2 AS cert-installer

WORKDIR /app

FROM golang:1.23.2 AS builder

WORKDIR /app

COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .

RUN --mount=type=cache,target="/root/.cache/go-build" go build -o bin ./cmd

FROM builder AS final

CMD ["/app/bin"]