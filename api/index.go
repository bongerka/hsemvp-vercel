package handler

import (
	"net/http"

	"clinicadmin-ai/app"
)

var server = app.NewServer()

func Handler(w http.ResponseWriter, r *http.Request) {
	server.ServeHTTP(w, r)
}
