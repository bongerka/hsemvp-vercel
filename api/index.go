package handler

import (
	"net/http"

	"clinicadmin-ai/internal/app"
)

var server = app.NewServer()

func Handler(w http.ResponseWriter, r *http.Request) {
	server.ServeHTTP(w, r)
}
