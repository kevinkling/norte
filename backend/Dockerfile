FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /norte-api ./cmd/norte-api

FROM alpine:3.20
RUN adduser -D -H norte
WORKDIR /app
COPY --from=build /norte-api /usr/local/bin/norte-api
USER norte
EXPOSE 8080
ENV PORT=8080 SQLITE_PATH=/data/norte.db
CMD ["norte-api"]
