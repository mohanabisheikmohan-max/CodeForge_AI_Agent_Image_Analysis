# CodeForge AI — Software Engineering Development Agent

A Flask + Gemini software-engineering agent that turns natural-language requirements into answers, copy-ready code, individual files, VS Code commands, and real ZIP-ready projects.

## Features
- Requirement analysis
- Copy-paste-ready code
- Single-file and multi-file generation
- Real ZIP creation from generated files
- Per-file code viewer and copy button
- VS Code / terminal commands
- Browser recent-search history
- Responsive professional developer UI
- Gemini API integration with structured JSON output

## Structure
```text
CodeForge_AI_Agent/
├── app.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── templates/index.html
├── static/styles.css
├── static/app.js
└── tests/test_app.py
```

## VS Code / Windows
```powershell
cd CodeForge_AI_Agent
code .
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
Create `.env` beside `app.py`:
```env
GEMINI_API_KEY=YOUR_REAL_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
```
Run:
```powershell
python app.py
```
Open `http://127.0.0.1:5000`

## Render
Build Command: `pip install -r requirements.txt`
Start Command: `gunicorn app:app`
Environment Variables: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`

Never upload `.env` or real API keys to GitHub. Review generated code before running it.
