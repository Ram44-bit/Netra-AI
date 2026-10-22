# NETRA — Camera + Vision AI MVP

A mobile-first accessible web app that captures a user-approved camera image, sends it to a Python/FastAPI backend, asks Gemini to describe it, and reads the answer aloud using browser speech synthesis.

## What this MVP does
- Rear-camera capture on phones, with an image-upload fallback.
- Hindi, English, and Bengali UI/AI response selection.
- Voice question input where the browser supports it; typed question always available.
- Text answer, repeat-answer button, stop-speech button, keyboard-operable controls, labels, focus styles, and live status announcements.
- Server-side API key, image type/size validation, rate-limit-ready structure, no intentional photo storage.
- Explicit privacy notice and navigation safety warning.

## Important limits
This is a prototype, not a certified mobility aid. Do not use it as the sole aid for walking, crossing roads, detecting traffic lights, or avoiding obstacles. Image descriptions can be wrong, incomplete, or outdated. Test only in a safe, stationary setting and involve blind/low-vision users before any real-world use.

## Folder layout
```text
netra-camera-mvp/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── config.js
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md
```

## Phone-only build path
Use your phone browser to create a GitHub repository and upload these files (or upload the ZIP contents). Then deploy the backend on Render and the static frontend on Render Static Site or another static host. Render's official FastAPI instructions use:
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

Official docs:
- Gemini image understanding: https://ai.google.dev/gemini-api/docs/image-understanding
- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Render FastAPI deploy: https://render.com/docs/deploy-fastapi
- Render secrets/environment variables: https://render.com/docs/configure-environment-variables

## 1. Create a Gemini API key
Create an API key through Google AI Studio. Keep it private. Do not paste it into `frontend/config.js`, HTML, JavaScript, GitHub, screenshots, or public messages.

## 2. Deploy backend on Render
1. Push this folder to a GitHub repository.
2. In Render, choose **New → Web Service** and connect the repository.
3. Set **Root Directory** to `backend`.
4. Runtime: Python.
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables:
   - `GEMINI_API_KEY` = your secret API key
   - `GEMINI_MODEL` = `gemini-3.8-flash`
   - `FRONTEND_ORIGIN` = your final frontend URL (for example `https://your-site.onrender.com`)
8. Deploy. Open `https://YOUR-BACKEND.onrender.com/health`. Expect JSON with status `ok`.
9. Open `https://YOUR-BACKEND.onrender.com/docs` to inspect the API. Do not publish private keys.

The selected model is listed in Google's current model documentation at time this starter was prepared. If it is not enabled for your API project, choose a currently available image-capable model in the Google AI model list and update `GEMINI_MODEL`.

## 3. Deploy frontend
1. In Render, choose **New → Static Site** and connect the same repository.
2. Set **Root Directory** to `frontend`.
3. Build command: leave empty.
4. Publish directory: `.`
5. Deploy the site.
6. Copy the final frontend URL and set it as `FRONTEND_ORIGIN` on the backend, then redeploy backend.
7. In `frontend/config.js`, replace `https://YOUR-BACKEND.onrender.com` with the actual backend URL and commit the change. The static site should redeploy automatically.

## 4. Test checklist
- Open the frontend over HTTPS on your phone.
- Check the privacy and safety notes.
- Press **Start camera** and grant permission only if you want to.
- Capture a harmless stationary scene (e.g. desk with a cup and book).
- Ask: “Describe my surroundings” and test Hindi/English.
- Try **Ask by voice**. If unsupported, type your question.
- Test **Repeat answer** and **Stop speech**.
- Test file upload if camera access is unavailable.
- Use Tab/Shift+Tab and a screen reader (Android TalkBack) to verify focus and labels.
- Test denied camera permission, no network, API key missing, invalid file type, and oversized upload.
- Confirm that a bad API key produces a friendly error rather than a false answer.

## 5. Phone-only file editing
You can edit files directly in GitHub's mobile website:
1. Open the repository.
2. Tap a file → pencil/Edit.
3. Change code → Commit changes.
4. Render rebuilds on each commit if auto-deploy is enabled.

Alternatively use any trusted mobile code editor to edit the extracted ZIP and upload the files to GitHub.

## Privacy
- The app sends the captured image and your typed/spoken question to your backend; the backend sends the image and prompt to the AI provider.
- The app does not save captured images to its own server or a database in this MVP.
- The AI provider's processing and retention terms still apply. Do not upload private documents, identifiable people, or sensitive scenes during testing.
- Voice recognition may be processed by the browser/platform provider. Use typed input if you do not want to use speech recognition.
- Do not place API keys in frontend code. Restrict and monitor API usage where provider controls allow it.

## Troubleshooting
- `Camera unavailable`: open the HTTPS deployed site, check browser permission, and close other apps using the camera.
- `CORS error`: set `FRONTEND_ORIGIN` to the exact frontend origin including `https://` and no trailing path, then redeploy backend.
- `AI service error`: verify `GEMINI_API_KEY`, model availability, quota, and Render logs.
- `Voice input unavailable`: use the question field. Speech recognition support varies by browser/language.
- First request is slow: free hosting may sleep when idle; wait and retry.

## Navigation is intentionally not implemented yet
Do not present image description as navigation. The next milestone needs a dedicated pedestrian-routing provider, explicit location permission, route freshness checks, spoken turn instructions, and supervised usability/safety testing. A road route is not necessarily a walkable or accessible route.
