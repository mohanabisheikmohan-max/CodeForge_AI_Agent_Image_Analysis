import io, json, os, re, zipfile
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_file
from google import genai
from google.genai import types
load_dotenv()
app=Flask(__name__)
API_KEY=os.getenv('GEMINI_API_KEY','').strip(); MODEL=os.getenv('GEMINI_MODEL','gemini-3.1-flash-lite').strip()
client=None if not API_KEY or API_KEY=='PASTE_YOUR_GEMINI_API_KEY_HERE' else genai.Client(api_key=API_KEY)
OUTPUT_SCHEMA={'type':'object','properties':{'title':{'type':'string'},'summary':{'type':'string'},'response_type':{'type':'string','enum':['answer','code','project','file','mixed']},'answer':{'type':'string'},'files':{'type':'array','items':{'type':'object','properties':{'path':{'type':'string'},'language':{'type':'string'},'content':{'type':'string'}},'required':['path','language','content']}},'commands':{'type':'array','items':{'type':'string'}},'notes':{'type':'array','items':{'type':'string'}}},'required':['title','summary','response_type','answer','files','commands','notes']}
SYSTEM_PROMPT='''You are CodeForge AI, a software-engineering development agent. Turn natural-language requirements into useful development outputs. If the user asks for code, return complete copy-paste-ready code. If they ask for a file, put it in files. If they ask for a project or ZIP, return every required file in files; the application packages those files into a real ZIP. Never use vague pseudocode when complete code is requested. Keep paths relative and safe; never use ../ or absolute paths. Never include real API keys; use .env placeholders and .gitignore. For web projects, make frontend polished, responsive, accessible and professional. Include README/setup/commands when useful. Do not claim code was executed or tested unless evidence is provided. Match the user language when practical. Return JSON exactly matching the provided schema.'''
def sanitize_path(value):
    value=value.replace('\\','/').strip().lstrip('/'); value=re.sub(r'^[A-Za-z]:','',value)
    return '/'.join(p for p in value.split('/') if p not in ('','.','..')) or 'generated_file.txt'
def normalize_result(data):
    seen=set(); out=[]
    for item in data.get('files',[]):
        if not isinstance(item,dict): continue
        path=sanitize_path(str(item.get('path','generated_file.txt')))
        if path in seen: continue
        seen.add(path); out.append({'path':path,'language':str(item.get('language','')),'content':str(item.get('content',''))})
    return {'title':str(data.get('title','CodeForge AI Result')),'summary':str(data.get('summary','')),'response_type':str(data.get('response_type','answer')),'answer':str(data.get('answer','')),'files':out,'commands':[str(x) for x in data.get('commands',[])],'notes':[str(x) for x in data.get('notes',[])]}
def ask_model(prompt):
    if client is None: raise RuntimeError('GEMINI_API_KEY is missing. Add a valid key to .env or Render Environment Variables.')
    response=client.models.generate_content(model=MODEL,contents=prompt,config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT,response_mime_type='application/json',response_schema=OUTPUT_SCHEMA,temperature=0.2))
    if not response.text: raise RuntimeError('Gemini returned an empty response.')
    return normalize_result(json.loads(response.text))
def analyze_uploaded_image(image_bytes: bytes, mime_type: str, user_prompt: str):
    if client is None:
        raise RuntimeError("GEMINI_API_KEY is missing. Configure it in .env or Render Environment Variables.")

    image_instruction = f"""
Analyze the user's uploaded image for software-development feedback.
User request: {user_prompt or "Identify visible mistakes and suggest improvements."}
Describe what is visible. If it is a website/app screenshot, identify visible UI issues,
explain why they matter, and give specific corrections. If helpful, provide complete
copy-ready files in the files array. Do not claim to inspect source code that is not
visible. Clearly state uncertainty where the screenshot does not provide enough evidence.
Return the standard CodeForge JSON schema.
"""
    response = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            image_instruction,
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=OUTPUT_SCHEMA,
            temperature=0.2,
        ),
    )
    raw = response.text or ""
    if not raw:
        raise RuntimeError("Gemini returned an empty image-analysis response.")
    return normalize_result(json.loads(raw))


def build_zip(files_list):
    memory=io.BytesIO()
    with zipfile.ZipFile(memory,'w',zipfile.ZIP_DEFLATED) as zf:
        for item in files_list: zf.writestr(sanitize_path(item['path']),item['content'])
    memory.seek(0); return memory
@app.get('/')
def home(): return render_template('index.html')
@app.get('/api/health')
def health(): return jsonify({'ok':True,'gemini_configured':client is not None,'model':MODEL})
@app.post('/api/generate')
def generate():
    prompt=((request.get_json(silent=True) or {}).get('prompt') or '').strip()
    if not prompt: return jsonify({'error':'Please enter a requirement or prompt.'}),400
    try: return jsonify(ask_model(prompt))
    except json.JSONDecodeError: return jsonify({'error':'The AI returned invalid structured data. Please try again.'}),502
    except Exception as exc: return jsonify({'error':str(exc)}),500
@app.post('/api/analyze-image')
def analyze_image():
    if "image" not in request.files:
        return jsonify({"error": "Please choose an image to analyze."}), 400
    image = request.files["image"]
    if not image.filename:
        return jsonify({"error": "Please choose an image file."}), 400
    mime_type = (image.mimetype or "").lower()
    if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
        return jsonify({"error": "Supported formats: PNG, JPG/JPEG and WEBP."}), 415
    image_bytes = image.read()
    if not image_bytes:
        return jsonify({"error": "The selected image is empty."}), 400
    if len(image_bytes) > 8 * 1024 * 1024:
        return jsonify({"error": "Image must be 8 MB or smaller."}), 413
    user_prompt = (request.form.get("prompt") or "").strip()
    try:
        return jsonify(analyze_uploaded_image(image_bytes, mime_type, user_prompt))
    except json.JSONDecodeError:
        return jsonify({"error": "The AI returned invalid structured data. Please try again."}), 502
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post('/api/download-zip')
def download_zip():
    raw=(request.get_json(silent=True) or {}).get('files') or []
    safe=[{'path':sanitize_path(str(x.get('path','generated_file.txt'))),'content':str(x.get('content',''))} for x in raw if isinstance(x,dict)]
    if not safe: return jsonify({'error':'No generated files are available for ZIP creation.'}),400
    return send_file(build_zip(safe),mimetype='application/zip',as_attachment=True,download_name='CodeForge_Project.zip')
if __name__=='__main__': app.run(host='0.0.0.0',port=5000,debug=True)
