package openai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"path/filepath"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("OPENAI_API_KEY is not configured")

type Client struct {
	apiKey          string
	chatModel       string
	transcribeModel string
	httpClient      *http.Client
}

type Source struct {
	FileID   string  `json:"file_id"`
	FileName string  `json:"file_name"`
	Excerpt  string  `json:"excerpt"`
	Score    float64 `json:"score"`
}

func New(apiKey, chatModel, transcribeModel string) *Client {
	if strings.TrimSpace(apiKey) == "" {
		return nil
	}

	if strings.TrimSpace(chatModel) == "" {
		chatModel = "gpt-4o-mini"
	}
	if strings.TrimSpace(transcribeModel) == "" {
		transcribeModel = "gpt-4o-mini-transcribe"
	}

	return &Client{
		apiKey:          apiKey,
		chatModel:       chatModel,
		transcribeModel: transcribeModel,
		httpClient: &http.Client{
			Timeout: 90 * time.Second,
		},
	}
}

func (c *Client) CreateVectorStore(ctx context.Context, name string) (string, error) {
	if c == nil {
		return "", ErrNotConfigured
	}

	var response struct {
		ID string `json:"id"`
	}
	if err := c.doJSON(ctx, "/vector_stores", betaHeader(), map[string]any{
		"name": name,
	}, &response); err != nil {
		return "", err
	}
	return response.ID, nil
}

func (c *Client) UploadKnowledgeFile(ctx context.Context, fileName, contentType string, data []byte) (string, error) {
	if c == nil {
		return "", ErrNotConfigured
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("purpose", "user_data")

	partHeaders := make(textproto.MIMEHeader)
	partHeaders.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filepath.Base(fileName)))
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	partHeaders.Set("Content-Type", contentType)

	part, err := writer.CreatePart(partHeaders)
	if err != nil {
		return "", err
	}
	if _, err = part.Write(data); err != nil {
		return "", err
	}
	if err = writer.Close(); err != nil {
		return "", err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/files", &body)
	if err != nil {
		return "", err
	}
	request.Header.Set("Authorization", "Bearer "+c.apiKey)
	request.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.httpClient.Do(request)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("openai files upload failed (%d): %s", resp.StatusCode, string(raw))
	}

	var payload struct {
		ID string `json:"id"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}

	return payload.ID, nil
}

func (c *Client) AttachFileToVectorStore(ctx context.Context, vectorStoreID, fileID string) error {
	if c == nil {
		return ErrNotConfigured
	}

	return c.doJSON(ctx, fmt.Sprintf("/vector_stores/%s/files", vectorStoreID), betaHeader(), map[string]any{
		"file_id": fileID,
	}, nil)
}

func (c *Client) SearchVectorStore(ctx context.Context, vectorStoreID, query string) ([]Source, error) {
	if c == nil {
		return nil, ErrNotConfigured
	}

	var payload struct {
		Data []struct {
			FileID   string  `json:"file_id"`
			FileName string  `json:"filename"`
			Score    float64 `json:"score"`
			Content  []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"data"`
	}

	if err := c.doJSON(ctx, fmt.Sprintf("/vector_stores/%s/search", vectorStoreID), betaHeader(), map[string]any{
		"query":           query,
		"rewrite_query":   true,
		"max_num_results": 4,
		"ranking_options": map[string]any{
			"score_threshold": 0.1,
		},
	}, &payload); err != nil {
		return nil, err
	}

	sources := make([]Source, 0, len(payload.Data))
	for _, item := range payload.Data {
		var parts []string
		for _, block := range item.Content {
			if block.Type == "text" && strings.TrimSpace(block.Text) != "" {
				parts = append(parts, block.Text)
			}
		}
		excerpt := strings.TrimSpace(strings.Join(parts, "\n"))
		if excerpt == "" {
			continue
		}
		if len(excerpt) > 420 {
			excerpt = strings.TrimSpace(excerpt[:419]) + "…"
		}
		sources = append(sources, Source{
			FileID:   item.FileID,
			FileName: item.FileName,
			Excerpt:  excerpt,
			Score:    item.Score,
		})
	}

	return sources, nil
}

func (c *Client) GenerateAnswer(ctx context.Context, organizationName, question string, history [][2]string, sources []Source) (string, error) {
	if c == nil {
		return "", ErrNotConfigured
	}

	var historyBlock strings.Builder
	for _, item := range history {
		historyBlock.WriteString(item[0])
		historyBlock.WriteString(": ")
		historyBlock.WriteString(item[1])
		historyBlock.WriteString("\n")
	}

	var contextBlock strings.Builder
	for index, source := range sources {
		fmt.Fprintf(&contextBlock, "Источник %d: %s\nФрагмент:\n%s\n\n", index+1, source.FileName, source.Excerpt)
	}

	var payload struct {
		OutputText string `json:"output_text"`
		Output     []struct {
			Content []struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}

	if err := c.doJSON(ctx, "/responses", nil, map[string]any{
		"model": c.chatModel,
		"instructions": "Ты помощник для администратора стоматологической клиники. " +
			"Отвечай по-русски, кратко и по делу. Используй только контекст из базы знаний. " +
			"Если точного ответа нет в документах, честно скажи об этом.",
		"input": []map[string]any{
			{
				"role": "user",
				"content": []map[string]string{
					{
						"type": "input_text",
						"text": fmt.Sprintf(
							"Организация: %s\n\nИстория:\n%s\nВопрос:\n%s\n\nКонтекст:\n%s",
							organizationName,
							strings.TrimSpace(historyBlock.String()),
							question,
							strings.TrimSpace(contextBlock.String()),
						),
					},
				},
			},
		},
	}, &payload); err != nil {
		return "", err
	}

	if strings.TrimSpace(payload.OutputText) != "" {
		return strings.TrimSpace(payload.OutputText), nil
	}

	var textParts []string
	for _, item := range payload.Output {
		for _, content := range item.Content {
			if content.Type == "output_text" || content.Type == "text" {
				if trimmed := strings.TrimSpace(content.Text); trimmed != "" {
					textParts = append(textParts, trimmed)
				}
			}
		}
	}

	answer := strings.TrimSpace(strings.Join(textParts, "\n"))
	if answer == "" {
		return "", errors.New("openai returned an empty response")
	}

	return answer, nil
}

func (c *Client) Transcribe(ctx context.Context, fileName, contentType string, data []byte) (string, error) {
	if c == nil {
		return "", ErrNotConfigured
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("model", c.transcribeModel)
	_ = writer.WriteField("response_format", "json")

	partHeaders := make(textproto.MIMEHeader)
	partHeaders.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, filepath.Base(fileName)))
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	partHeaders.Set("Content-Type", contentType)

	part, err := writer.CreatePart(partHeaders)
	if err != nil {
		return "", err
	}
	if _, err = part.Write(data); err != nil {
		return "", err
	}
	if err = writer.Close(); err != nil {
		return "", err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/audio/transcriptions", &body)
	if err != nil {
		return "", err
	}
	request.Header.Set("Authorization", "Bearer "+c.apiKey)
	request.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.httpClient.Do(request)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("openai transcription failed (%d): %s", resp.StatusCode, string(raw))
	}

	var payload struct {
		Text string `json:"text"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}

	return strings.TrimSpace(payload.Text), nil
}

func (c *Client) doJSON(ctx context.Context, path string, extraHeaders map[string]string, input any, out any) error {
	body, err := json.Marshal(input)
	if err != nil {
		return err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1"+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+c.apiKey)
	request.Header.Set("Content-Type", "application/json")
	for key, value := range extraHeaders {
		request.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("openai request failed (%d): %s", resp.StatusCode, string(raw))
	}

	if out == nil {
		return nil
	}

	return json.NewDecoder(resp.Body).Decode(out)
}

func betaHeader() map[string]string {
	return map[string]string{
		"OpenAI-Beta": "assistants=v2",
	}
}
