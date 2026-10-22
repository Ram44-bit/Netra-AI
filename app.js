(() => {
  "use strict";

  const API_BASE_URL = (window.NETRA_CONFIG?.API_BASE_URL || "").replace(/\/+$/, "");
  const video = document.querySelector("#camera");
  const placeholder = document.querySelector("#cameraPlaceholder");
  const cameraFrame = document.querySelector("#cameraFrame");
  const status = document.querySelector("#status");
  const answer = document.querySelector("#answer");
  const startCameraButton = document.querySelector("#startCamera");
  const stopCameraButton = document.querySelector("#stopCamera");
  const captureButton = document.querySelector("#capture");
  const photoInput = document.querySelector("#photoInput");
  const questionInput = document.querySelector("#question");
  const languageSelect = document.querySelector("#language");
  const askVoiceButton = document.querySelector("#askVoice");
  const stopListeningButton = document.querySelector("#stopListening");
  const repeatButton = document.querySelector("#repeat");
  const stopSpeechButton = document.querySelector("#stopSpeech");

  const LANGUAGES = {
    "hi-IN": { ai: "Hindi", defaultQuestion: "Mere aas-paas kya hai? Seedhi aur saaf bhasha mein batao." },
    "en-US": { ai: "English", defaultQuestion: "What is around me? Describe it clearly and simply." },
    "bn-IN": { ai: "Bengali", defaultQuestion: "আমার চারপাশে কী আছে? সহজ ভাষায় পরিষ্কার করে বলুন।" }
  };

  let stream = null;
  let selectedPhoto = null;
  let lastAnswer = "";
  let recognition = null;
  let busy = false;

  function setStatus(message, kind = "info") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function setBusy(value) {
    busy = value;
    captureButton.disabled = value || (!stream && !selectedPhoto);
    captureButton.textContent = value ? "Analysing scene…" : "✦ Describe this scene";
    startCameraButton.disabled = value;
    photoInput.disabled = value;
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    video.srcObject = null;
    video.style.display = "none";
    placeholder.hidden = false;
    stopCameraButton.disabled = true;
    startCameraButton.disabled = false;
    captureButton.disabled = !selectedPhoto || busy;
    setStatus("Camera is off. Choose a photo or start the camera again.");
  }

  startCameraButton.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera access needs a supported browser and a secure HTTPS page. You can choose a photo instead.", "error");
      return;
    }
    try {
      setStatus("Requesting camera permission. Allow access only if you want to.");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      video.srcObject = stream;
      video.style.display = "block";
      placeholder.hidden = true;
      await video.play();
      stopCameraButton.disabled = false;
      startCameraButton.disabled = true;
      captureButton.disabled = false;
      setStatus("Camera ready. Hold the phone still and capture when you are ready.");
    } catch (error) {
      const reason = error?.name === "NotAllowedError"
        ? "Camera permission was not granted. You can allow it in browser settings or choose a photo."
        : "Could not open the camera. Close other camera apps, check browser permissions, or choose a photo.";
      setStatus(reason, "error");
    }
  });

  stopCameraButton.addEventListener("click", stopCamera);

  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    selectedPhoto = null;
    if (!file) {
      captureButton.disabled = !stream || busy;
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      photoInput.value = "";
      setStatus("Please choose a JPEG, PNG, or WebP image.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      photoInput.value = "";
      setStatus("That photo is larger than 8 MB. Choose a smaller image.", "error");
      return;
    }
    selectedPhoto = file;
    captureButton.disabled = busy;
    setStatus("Photo selected. Press “Describe this scene” when you are ready to send it for AI analysis.");
  });

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image capture failed")), "image/jpeg", 0.82);
    });
  }

  async function getImageBlob() {
    if (selectedPhoto) return selectedPhoto;
    if (!stream || !video.videoWidth) throw new Error("Start the camera or choose a photo first.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      setStatus("Text-to-speech is not supported by this browser. The answer is available on screen.", "error");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageSelect.value;
    utterance.rate = 0.94;
    utterance.onstart = () => { stopSpeechButton.disabled = false; };
    utterance.onend = () => { stopSpeechButton.disabled = true; };
    utterance.onerror = () => {
      stopSpeechButton.disabled = true;
      setStatus("Speech playback did not work. Use the on-screen answer or try another voice in device settings.", "error");
    };
    window.speechSynthesis.speak(utterance);
  }

  captureButton.addEventListener("click", async () => {
    if (busy) return;
    try {
      const imageBlob = await getImageBlob();
      if (imageBlob.size > 8 * 1024 * 1024) {
        setStatus("Image is larger than 8 MB. Choose a smaller photo.", "error");
        return;
      }
      if (!API_BASE_URL || API_BASE_URL.includes("YOUR-BACKEND")) {
        setStatus("Setup needed: add your deployed backend URL in frontend/config.js.", "error");
        return;
      }

      const form = new FormData();
      form.append("image", imageBlob, "netra-scene.jpg");
      form.append("question", questionInput.value.trim() || LANGUAGES[languageSelect.value].defaultQuestion);
      form.append("language", LANGUAGES[languageSelect.value].ai);

      setBusy(true);
      setStatus("Sending the selected image for analysis. Please wait.");
      answer.textContent = "Analysing…";
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 60000);

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/api/describe`, {
          method: "POST",
          body: form,
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "AI service could not process this image. Please try again.");
      }
      lastAnswer = data.description || "I could not create a description.";
      answer.textContent = lastAnswer;
      repeatButton.disabled = false;
      setStatus("Description ready. Please verify important details; AI can make mistakes.");
      speak(lastAnswer);
    } catch (error) {
      const message = error?.name === "AbortError"
        ? "The request took too long. Please try again when your connection is stable."
        : (error?.message || "Something went wrong. Please try again.");
      setStatus(message, "error");
      answer.textContent = "No answer received.";
    } finally {
      setBusy(false);
    }
  });

  repeatButton.addEventListener("click", () => {
    if (lastAnswer) speak(lastAnswer);
  });

  stopSpeechButton.addEventListener("click", () => {
    window.speechSynthesis?.cancel();
    stopSpeechButton.disabled = true;
    setStatus("Speech stopped.");
  });

  languageSelect.addEventListener("change", () => {
    const previousDefault = "Mere aas-paas kya hai? Seedhi aur saaf bhasha mein batao.";
    if (questionInput.value === previousDefault ||
        questionInput.value === "What is around me? Describe it clearly and simply." ||
        questionInput.value === "আমার চারপাশে কী আছে? সহজ ভাষায় পরিষ্কার করে বলুন।") {
      questionInput.value = LANGUAGES[languageSelect.value].defaultQuestion;
    }
    setStatus("Response language changed. Voice availability depends on your browser and installed voices.");
  });

  document.querySelectorAll("[data-question-hi]").forEach(button => {
    button.addEventListener("click", () => {
      const lang = languageSelect.value;
      const key = lang === "en-US" ? "questionEn" : lang === "bn-IN" ? "questionBn" : "questionHi";
      const attr = lang === "en-US" ? "questionEn" : lang === "bn-IN" ? "questionBn" : "questionHi";
      questionInput.value = button.dataset[attr] || button.dataset.questionHi;
      questionInput.focus();
    });
  });

  askVoiceButton.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Voice input is not supported in this browser. Type your question instead.", "error");
      questionInput.focus();
      return;
    }
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
    }
    recognition = new SpeechRecognition();
    recognition.lang = languageSelect.value;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      askVoiceButton.disabled = true;
      stopListeningButton.disabled = false;
      setStatus("Listening. Speak your question now.");
    };
    recognition.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        questionInput.value = transcript;
        setStatus("Voice question captured. Review or edit it before sending.");
        questionInput.focus();
      }
    };
    recognition.onerror = event => {
      setStatus(event.error === "not-allowed"
        ? "Microphone permission was denied. Type your question instead."
        : "Voice input failed. Please type your question and try again later.", "error");
    };
    recognition.onend = () => {
      askVoiceButton.disabled = false;
      stopListeningButton.disabled = true;
    };
    try { recognition.start(); }
    catch (_) { setStatus("Could not start voice input. Type your question instead.", "error"); }
  });

  stopListeningButton.addEventListener("click", () => {
    if (recognition) recognition.stop();
  });

  window.addEventListener("pagehide", () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (recognition) {
      try { recognition.stop(); } catch (_) {}
    }
    window.speechSynthesis?.cancel();
  });

  cameraFrame.addEventListener("click", () => {
    // Intentionally no camera activation on preview tap; explicit button is required.
  });
})();
