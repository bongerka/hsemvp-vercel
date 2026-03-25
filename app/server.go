package app

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"clinicadmin-ai/internal/auth"
	"clinicadmin-ai/internal/openai"
	"clinicadmin-ai/internal/store"
	"clinicadmin-ai/internal/telegram"

	"github.com/go-chi/chi/v5"
)

//go:embed templates/*.html static/*
var assets embed.FS

type Server struct {
	router     chi.Router
	templates  *template.Template
	store      *store.Store
	openai     *openai.Client
	telegram   *telegram.Client
	appURL     string
	tgUsername string
	tgSecret   string
	metricaID  string
}

type pageData struct {
	Title              string
	CurrentUser        *store.User
	Error              string
	Success            string
	Messages           []store.Message
	Documents          []store.Document
	Dashboard          *store.DashboardData
	TelegramConnectURL string
	TelegramBotName    string
	TranscribeURL      string
	YandexMetricaID    string
}

func NewServer() *Server {
	dbStore, err := store.Open(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Printf("store init error: %v", err)
	}

	s := &Server{
		router:     chi.NewRouter(),
		store:      dbStore,
		openai:     openai.New(os.Getenv("OPENAI_API_KEY"), os.Getenv("OPENAI_CHAT_MODEL"), os.Getenv("OPENAI_TRANSCRIBE_MODEL")),
		telegram:   telegram.New(os.Getenv("TELEGRAM_BOT_TOKEN")),
		appURL:     strings.TrimSuffix(os.Getenv("APP_URL"), "/"),
		tgUsername: strings.TrimPrefix(strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME")), "@"),
		tgSecret:   strings.TrimSpace(os.Getenv("TELEGRAM_WEBHOOK_SECRET")),
		metricaID:  strings.TrimSpace(os.Getenv("YANDEX_METRICA_ID")),
		templates: template.Must(
			template.New("pages").Funcs(template.FuncMap{
				"formatTime": formatTime,
				"channelLabel": func(channel string) string {
					if channel == "telegram" {
						return "Telegram"
					}
					return "Web"
				},
				"marshal": func(value any) template.JS {
					raw, _ := json.Marshal(value)
					return template.JS(raw)
				},
			}).ParseFS(assets, "templates/*.html"),
		),
	}

	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

func (s *Server) routes() {
	fileServer := http.FileServer(http.FS(assets))
	s.router.Handle("/static/*", http.StripPrefix("/", fileServer))

	s.router.Get("/", s.handleLanding)
	s.router.Get("/login", s.handleLoginPage)
	s.router.Post("/login", s.handleLoginSubmit)
	s.router.Get("/register", s.handleRegisterPage)
	s.router.Post("/register", s.handleRegisterSubmit)
	s.router.Post("/logout", s.handleLogout)

	s.router.Get("/app/chat", s.handleChatPage)
	s.router.Post("/app/chat", s.handleChatSubmit)
	s.router.Post("/app/transcribe", s.handleTranscribe)
	s.router.Get("/app/files", s.handleFilesPage)
	s.router.Post("/app/files", s.handleFilesUpload)
	s.router.Get("/app/dashboard", s.handleDashboardPage)

	s.router.Post("/telegram/webhook", s.handleTelegramWebhook)
}

func (s *Server) render(w http.ResponseWriter, name string, data pageData) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := s.templates.ExecuteTemplate(w, name, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (s *Server) currentUser(r *http.Request) (*store.User, error) {
	user, err := auth.CurrentUser(r, s.store)
	if errors.Is(err, store.ErrNotConfigured) {
		return nil, nil
	}
	return user, err
}

func (s *Server) requireUser(w http.ResponseWriter, r *http.Request) (*store.User, bool) {
	user, err := s.currentUser(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return nil, false
	}
	if user == nil {
		http.Redirect(w, r, "/login?error=Сначала%20войдите%20в%20кабинет", http.StatusSeeOther)
		return nil, false
	}
	return user, true
}

func (s *Server) ensureVisitorID(w http.ResponseWriter, r *http.Request) string {
	if cookie, err := r.Cookie("clinicadmin_visitor"); err == nil && strings.TrimSpace(cookie.Value) != "" {
		return cookie.Value
	}

	value := strings.ReplaceAll(time.Now().Format("20060102150405.000000000"), ".", "")
	http.SetCookie(w, &http.Cookie{
		Name:     "clinicadmin_visitor",
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(r),
		MaxAge:   180 * 24 * 60 * 60,
	})
	return value
}

func (s *Server) queryMessage(r *http.Request, key string) string {
	return strings.TrimSpace(r.URL.Query().Get(key))
}

func (s *Server) track(ctx context.Context, event store.Event) {
	if s.store == nil {
		return
	}
	if err := s.store.TrackEvent(ctx, event); err != nil {
		log.Printf("track event %s: %v", event.Name, err)
	}
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("02.01.2006 15:04")
}

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}
