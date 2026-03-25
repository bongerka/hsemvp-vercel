package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"

	"clinicadmin-ai/internal/auth"
	"clinicadmin-ai/internal/store"
	"clinicadmin-ai/internal/telegram"
)

func (s *Server) handleLanding(w http.ResponseWriter, r *http.Request) {
	visitorID := s.ensureVisitorID(w, r)
	s.track(r.Context(), store.Event{
		Name:      "landing_view",
		VisitorID: visitorID,
		Metadata: map[string]any{
			"path": r.URL.Path,
		},
	})

	user, _ := s.currentUser(r)
	s.render(w, "landing", pageData{
		Title:           "ClinicAdmin AI",
		CurrentUser:     user,
		Error:           s.queryMessage(r, "error"),
		Success:         s.queryMessage(r, "success"),
		YandexMetricaID: s.metricaID,
	})
}

func (s *Server) handleLoginPage(w http.ResponseWriter, r *http.Request) {
	s.render(w, "login", pageData{
		Title:       "Вход",
		Error:       s.queryMessage(r, "error"),
		Success:     s.queryMessage(r, "success"),
		CurrentUser: nil,
	})
}

func (s *Server) handleLoginSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/login?error="+url.QueryEscape("Не удалось прочитать форму"), http.StatusSeeOther)
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")

	if email == "" || password == "" {
		http.Redirect(w, r, "/login?error="+url.QueryEscape("Заполните email и пароль"), http.StatusSeeOther)
		return
	}
	if s.store == nil {
		http.Redirect(w, r, "/login?error="+url.QueryEscape("DATABASE_URL не настроен"), http.StatusSeeOther)
		return
	}

	user, err := s.store.FindUserByEmail(r.Context(), email)
	if err != nil {
		http.Redirect(w, r, "/login?error="+url.QueryEscape("Ошибка поиска пользователя"), http.StatusSeeOther)
		return
	}
	if user == nil || auth.ComparePassword(user.PasswordHash, password) != nil {
		http.Redirect(w, r, "/login?error="+url.QueryEscape("Неверный email или пароль"), http.StatusSeeOther)
		return
	}

	if err := auth.CreateSession(r.Context(), s.store, w, r, user.ID); err != nil {
		http.Redirect(w, r, "/login?error="+url.QueryEscape("Не удалось создать сессию"), http.StatusSeeOther)
		return
	}

	http.Redirect(w, r, "/app/chat?success="+url.QueryEscape("С возвращением"), http.StatusSeeOther)
}

func (s *Server) handleRegisterPage(w http.ResponseWriter, r *http.Request) {
	s.render(w, "register", pageData{
		Title:   "Регистрация",
		Error:   s.queryMessage(r, "error"),
		Success: s.queryMessage(r, "success"),
	})
}

func (s *Server) handleRegisterSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/register?error="+url.QueryEscape("Не удалось прочитать форму"), http.StatusSeeOther)
		return
	}
	if s.store == nil {
		http.Redirect(w, r, "/register?error="+url.QueryEscape("DATABASE_URL не настроен"), http.StatusSeeOther)
		return
	}

	clinicName := strings.TrimSpace(r.FormValue("clinic_name"))
	fullName := strings.TrimSpace(r.FormValue("full_name"))
	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")
	if clinicName == "" || fullName == "" || email == "" || password == "" {
		http.Redirect(w, r, "/register?error="+url.QueryEscape("Заполните все поля"), http.StatusSeeOther)
		return
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		http.Redirect(w, r, "/register?error="+url.QueryEscape("Не удалось обработать пароль"), http.StatusSeeOther)
		return
	}

	user, err := s.store.CreateUser(r.Context(), clinicName, fullName, email, hash)
	if err != nil {
		http.Redirect(w, r, "/register?error="+url.QueryEscape("Пользователь уже существует или БД недоступна"), http.StatusSeeOther)
		return
	}
	if err = auth.CreateSession(r.Context(), s.store, w, r, user.ID); err != nil {
		http.Redirect(w, r, "/register?error="+url.QueryEscape("Не удалось создать сессию"), http.StatusSeeOther)
		return
	}

	s.track(r.Context(), store.Event{
		Name:           "user_registered",
		OrganizationID: user.OrganizationID,
		UserID:         user.ID,
		VisitorID:      s.ensureVisitorID(w, r),
		Metadata: map[string]any{
			"email": user.Email,
		},
	})

	http.Redirect(w, r, "/app/files?success="+url.QueryEscape("Кабинет создан. Теперь загрузите документы клиники"), http.StatusSeeOther)
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(s.store, w, r)
	http.Redirect(w, r, "/?success="+url.QueryEscape("Вы вышли из кабинета"), http.StatusSeeOther)
}

func (s *Server) handleChatPage(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	chat, err := s.store.EnsureChat(r.Context(), user.OrganizationID, user.ID, "web", "")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	messages, err := s.store.GetMessages(r.Context(), chat.ID, 40)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.render(w, "chat", pageData{
		Title:              "Чат",
		CurrentUser:        user,
		Messages:           messages,
		Error:              s.queryMessage(r, "error"),
		Success:            s.queryMessage(r, "success"),
		TelegramConnectURL: s.telegramConnectURL(user.TelegramCode),
		TelegramBotName:    s.tgUsername,
		TranscribeURL:      "/app/transcribe",
	})
}

func (s *Server) handleChatSubmit(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/app/chat?error="+url.QueryEscape("Не удалось прочитать форму"), http.StatusSeeOther)
		return
	}

	question := strings.TrimSpace(r.FormValue("message"))
	if question == "" {
		http.Redirect(w, r, "/app/chat?error="+url.QueryEscape("Введите вопрос"), http.StatusSeeOther)
		return
	}

	_, err := s.answerQuestion(r.Context(), user, "web", "", question)
	if err != nil {
		http.Redirect(w, r, "/app/chat?error="+url.QueryEscape(err.Error()), http.StatusSeeOther)
		return
	}

	http.Redirect(w, r, "/app/chat", http.StatusSeeOther)
}

func (s *Server) handleTranscribe(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	if s.openai == nil {
		http.Error(w, `{"error":"OPENAI_API_KEY не настроен"}`, http.StatusBadRequest)
		return
	}

	if err := r.ParseMultipartForm(25 << 20); err != nil {
		http.Error(w, `{"error":"Не удалось прочитать аудио"}`, http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("audio")
	if err != nil {
		http.Error(w, `{"error":"Файл audio не найден"}`, http.StatusBadRequest)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, `{"error":"Не удалось прочитать файл"}`, http.StatusBadRequest)
		return
	}

	text, err := s.openai.Transcribe(r.Context(), header.Filename, header.Header.Get("Content-Type"), data)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(map[string]string{"text": text})
}

func (s *Server) handleFilesPage(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	documents, err := s.store.ListDocuments(r.Context(), user.OrganizationID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.render(w, "files", pageData{
		Title:              "Документы",
		CurrentUser:        user,
		Documents:          documents,
		Error:              s.queryMessage(r, "error"),
		Success:            s.queryMessage(r, "success"),
		TelegramConnectURL: s.telegramConnectURL(user.TelegramCode),
		TelegramBotName:    s.tgUsername,
	})
}

func (s *Server) handleFilesUpload(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}
	if s.openai == nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("OPENAI_API_KEY не настроен"), http.StatusSeeOther)
		return
	}
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось прочитать файл"), http.StatusSeeOther)
		return
	}

	file, header, err := r.FormFile("document")
	if err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Выберите файл"), http.StatusSeeOther)
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось прочитать файл"), http.StatusSeeOther)
		return
	}

	organization, err := s.store.GetOrganization(r.Context(), user.OrganizationID)
	if err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось загрузить организацию"), http.StatusSeeOther)
		return
	}
	if organization == nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Организация не найдена"), http.StatusSeeOther)
		return
	}

	vectorStoreID := organization.VectorStoreID
	if vectorStoreID == "" {
		vectorStoreID, err = s.openai.CreateVectorStore(r.Context(), organization.Name+" Knowledge Base")
		if err != nil {
			http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось создать vector store"), http.StatusSeeOther)
			return
		}
		if err = s.store.UpdateOrganizationVectorStore(r.Context(), organization.ID, vectorStoreID); err != nil {
			http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось сохранить vector store"), http.StatusSeeOther)
			return
		}
	}

	openAIFileID, err := s.openai.UploadKnowledgeFile(r.Context(), header.Filename, header.Header.Get("Content-Type"), data)
	if err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("OpenAI не принял файл: "+err.Error()), http.StatusSeeOther)
		return
	}
	if err = s.openai.AttachFileToVectorStore(r.Context(), vectorStoreID, openAIFileID); err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось прикрепить файл к vector store"), http.StatusSeeOther)
		return
	}
	if err = s.store.CreateDocument(r.Context(), organization.ID, header.Filename, header.Header.Get("Content-Type"), openAIFileID, "indexed", header.Size); err != nil {
		http.Redirect(w, r, "/app/files?error="+url.QueryEscape("Не удалось сохранить документ в БД"), http.StatusSeeOther)
		return
	}

	s.track(r.Context(), store.Event{
		Name:           "document_uploaded",
		OrganizationID: organization.ID,
		UserID:         user.ID,
		Metadata: map[string]any{
			"file_name": header.Filename,
			"size":      header.Size,
		},
	})

	http.Redirect(w, r, "/app/files?success="+url.QueryEscape("Документ загружен и доступен для поиска"), http.StatusSeeOther)
}

func (s *Server) handleDashboardPage(w http.ResponseWriter, r *http.Request) {
	user, ok := s.requireUser(w, r)
	if !ok {
		return
	}

	dashboard, err := s.store.Dashboard(r.Context(), user.OrganizationID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.render(w, "dashboard", pageData{
		Title:              "Дашборд",
		CurrentUser:        user,
		Dashboard:          dashboard,
		Error:              s.queryMessage(r, "error"),
		Success:            s.queryMessage(r, "success"),
		TelegramConnectURL: s.telegramConnectURL(user.TelegramCode),
		TelegramBotName:    s.tgUsername,
	})
}

func (s *Server) handleTelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if s.telegram == nil {
		http.Error(w, "telegram bot is not configured", http.StatusBadRequest)
		return
	}
	if s.tgSecret != "" && r.Header.Get("X-Telegram-Bot-Api-Secret-Token") != s.tgSecret {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var update telegram.Update
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if update.Message == nil || update.Message.From == nil {
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := s.processTelegramMessage(r.Context(), update); err != nil {
		log.Printf("telegram webhook: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

func (s *Server) processTelegramMessage(ctx context.Context, update telegram.Update) error {
	msg := update.Message
	from := msg.From
	if strings.HasPrefix(strings.TrimSpace(msg.Text), "/start") {
		code := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(msg.Text), "/start"))
		code = strings.TrimSpace(strings.TrimPrefix(code, "@"+s.tgUsername))
		if code == "" {
			return s.telegram.SendMessage(ctx, msg.Chat.ID, "Откройте веб-кабинет и нажмите кнопку подключения Telegram.")
		}

		user, err := s.store.FindUserByTelegramCode(ctx, code)
		if err != nil {
			return err
		}
		if user == nil {
			return s.telegram.SendMessage(ctx, msg.Chat.ID, "Код подключения не найден. Скопируйте новую ссылку из веб-кабинета.")
		}
		if err = s.store.LinkTelegramUser(ctx, user, from.ID, msg.Chat.ID, from.Username); err != nil {
			return err
		}
		s.track(ctx, store.Event{
			Name:           "telegram_linked",
			OrganizationID: user.OrganizationID,
			UserID:         user.ID,
			Metadata: map[string]any{
				"telegram_user_id": from.ID,
			},
		})
		return s.telegram.SendMessage(ctx, msg.Chat.ID, "Связка готова. Теперь можно задавать вопросы по базе знаний клиники текстом или голосом.")
	}

	identity, err := s.store.GetTelegramIdentity(ctx, from.ID)
	if err != nil {
		return err
	}
	if identity == nil {
		return s.telegram.SendMessage(ctx, msg.Chat.ID, "Сначала свяжите Telegram с веб-кабинетом через кнопку подключения.")
	}

	question := strings.TrimSpace(msg.Text)
	if msg.Voice != nil || msg.Audio != nil {
		if s.openai == nil {
			return s.telegram.SendMessage(ctx, msg.Chat.ID, "OPENAI_API_KEY не настроен, поэтому голос пока недоступен.")
		}

		fileID := ""
		fileName := "voice.ogg"
		if msg.Voice != nil {
			fileID = msg.Voice.FileID
		}
		if msg.Audio != nil {
			fileID = msg.Audio.FileID
			if strings.TrimSpace(msg.Audio.FileName) != "" {
				fileName = msg.Audio.FileName
			}
		}

		data, filePath, err := s.telegram.DownloadFile(ctx, fileID)
		if err != nil {
			return s.telegram.SendMessage(ctx, msg.Chat.ID, "Не удалось скачать голосовое сообщение из Telegram.")
		}
		if ext := filepath.Ext(filePath); ext != "" {
			fileName = "voice" + ext
		}

		question, err = s.openai.Transcribe(ctx, fileName, contentTypeFromFile(fileName), data)
		if err != nil {
			return s.telegram.SendMessage(ctx, msg.Chat.ID, "Не удалось распознать аудио. Попробуйте ещё раз или отправьте текст.")
		}
	}

	if strings.TrimSpace(question) == "" {
		return s.telegram.SendMessage(ctx, msg.Chat.ID, "Отправьте текстовый вопрос или голосовое сообщение.")
	}

	user := &store.User{
		ID:               identity.UserID,
		OrganizationID:   identity.OrganizationID,
		OrganizationName: identity.Organization,
		FullName:         identity.FullName,
	}

	answer, err := s.answerQuestion(ctx, user, "telegram", fmt.Sprintf("%d", msg.Chat.ID), question)
	if err != nil {
		return s.telegram.SendMessage(ctx, msg.Chat.ID, "Не удалось обработать вопрос: "+err.Error())
	}

	return s.telegram.SendMessage(ctx, msg.Chat.ID, trimTelegram(answer))
}

func (s *Server) answerQuestion(ctx context.Context, user *store.User, channel, externalChatID, question string) (string, error) {
	if s.store == nil {
		return "", errors.New("DATABASE_URL не настроен")
	}

	chat, err := s.store.EnsureChat(ctx, user.OrganizationID, user.ID, channel, externalChatID)
	if err != nil {
		return "", err
	}
	historyMessages, err := s.store.GetMessages(ctx, chat.ID, 6)
	if err != nil {
		return "", err
	}
	if err = s.store.AddMessage(ctx, chat.ID, "user", question, nil); err != nil {
		return "", err
	}

	organization, err := s.store.GetOrganization(ctx, user.OrganizationID)
	if err != nil {
		return "", err
	}
	if organization == nil {
		return "", errors.New("организация не найдена")
	}
	if s.openai == nil {
		answer := "OPENAI_API_KEY не настроен, поэтому ответ по базе знаний пока недоступен."
		_ = s.store.AddMessage(ctx, chat.ID, "assistant", answer, nil)
		return answer, nil
	}
	if organization.VectorStoreID == "" {
		answer := "Сначала загрузите внутренние документы клиники во вкладке «Документы», чтобы ассистент начал отвечать по базе знаний."
		_ = s.store.AddMessage(ctx, chat.ID, "assistant", answer, nil)
		return answer, nil
	}

	sources, err := s.openai.SearchVectorStore(ctx, organization.VectorStoreID, question)
	if err != nil {
		return "", err
	}
	if len(sources) == 0 {
		answer := "Я не нашёл ответ в загруженных материалах. Проверьте, что нужный документ загружен, или переформулируйте вопрос."
		_ = s.store.AddMessage(ctx, chat.ID, "assistant", answer, nil)
		s.track(ctx, store.Event{Name: "question_asked", OrganizationID: user.OrganizationID, UserID: user.ID, Metadata: map[string]any{"channel": channel, "resolved": false}})
		return answer, nil
	}

	history := make([][2]string, 0, len(historyMessages))
	for _, item := range historyMessages {
		role := "Пользователь"
		if item.Role != "user" {
			role = "Ассистент"
		}
		history = append(history, [2]string{role, item.Content})
	}

	answer, err := s.openai.GenerateAnswer(ctx, organization.Name, question, history, sources)
	if err != nil {
		return "", err
	}

	sourceRefs := make([]store.SourceRef, 0, len(sources))
	sourceNames := make([]string, 0, len(sources))
	for _, source := range sources {
		sourceRefs = append(sourceRefs, store.SourceRef{
			FileID:   source.FileID,
			FileName: source.FileName,
			Excerpt:  source.Excerpt,
			Score:    source.Score,
		})
		if source.FileName != "" {
			sourceNames = append(sourceNames, source.FileName)
		}
	}

	answerWithSources := answer
	if len(sourceNames) > 0 {
		answerWithSources += "\n\nИсточники: " + strings.Join(uniqueStrings(sourceNames), ", ")
	}

	if err = s.store.AddMessage(ctx, chat.ID, "assistant", answerWithSources, sourceRefs); err != nil {
		return "", err
	}

	s.track(ctx, store.Event{
		Name:           "question_asked",
		OrganizationID: user.OrganizationID,
		UserID:         user.ID,
		Metadata: map[string]any{
			"channel":  channel,
			"resolved": true,
		},
	})

	return answerWithSources, nil
}

func (s *Server) telegramConnectURL(code string) string {
	if s.tgUsername == "" || strings.TrimSpace(code) == "" {
		return ""
	}
	return fmt.Sprintf("https://t.me/%s?start=%s", s.tgUsername, code)
}

func trimTelegram(text string) string {
	text = strings.TrimSpace(text)
	if len(text) <= 4096 {
		return text
	}
	return strings.TrimSpace(text[:4093]) + "..."
}

func uniqueStrings(input []string) []string {
	seen := make(map[string]struct{}, len(input))
	result := make([]string, 0, len(input))
	for _, item := range input {
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		result = append(result, item)
	}
	return result
}

func contentTypeFromFile(fileName string) string {
	switch strings.ToLower(filepath.Ext(fileName)) {
	case ".mp3":
		return "audio/mpeg"
	case ".m4a":
		return "audio/mp4"
	case ".wav":
		return "audio/wav"
	case ".webm":
		return "audio/webm"
	case ".ogg", ".oga":
		return "audio/ogg"
	default:
		return "application/octet-stream"
	}
}
