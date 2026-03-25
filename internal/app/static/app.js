(function () {
  const button = document.querySelector("[data-record-btn]");
  const status = document.querySelector("[data-record-status]");
  const textarea = document.getElementById("chat-input");

  if (!button || !status || !textarea || !navigator.mediaDevices?.getUserMedia) {
    if (status && !navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Браузер не поддерживает запись с микрофона. Введите вопрос текстом.";
    }
    return;
  }

  let recorder = null;
  let chunks = [];

  button.addEventListener("click", async function () {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      button.textContent = "Записать голосом";
      status.textContent = "Обрабатываю запись...";
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks = [];

      recorder.addEventListener("dataavailable", function (event) {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", async function () {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "voice.webm");

        try {
          const response = await fetch(button.dataset.transcribeUrl, {
            method: "POST",
            body: formData
          });
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload.error || "Не удалось распознать голос");
          }
          textarea.value = payload.text || "";
          status.textContent = "Голос распознан. При желании отредактируйте текст и отправьте вопрос.";
        } catch (error) {
          status.textContent = error.message || "Ошибка распознавания.";
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      });

      recorder.start();
      button.textContent = "Остановить запись";
      status.textContent = "Идёт запись. Нажмите ещё раз, когда закончите.";
    } catch (error) {
      status.textContent = "Не удалось получить доступ к микрофону.";
    }
  });
})();
