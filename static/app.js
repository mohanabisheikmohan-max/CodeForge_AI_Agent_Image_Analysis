const $=id=>document.getElementById(id), promptInput=$("promptInput"), generateBtn=$("generateBtn"), loading=$("loading"), resultSection=$("resultSection"), resultTitle=$("resultTitle"), resultSummary=$("resultSummary"), answerCard=$("answerCard"), fileArea=$("fileArea"), fileTabs=$("fileTabs"), fileCount=$("fileCount"), activeFileName=$("activeFileName"), codeView=$("codeView"), copyCodeBtn=$("copyCodeBtn"), commandsArea=$("commandsArea"), commandsList=$("commandsList"), notesArea=$("notesArea"), notesList=$("notesList"), historyList=$("historyList"), toast=$("toast"), downloadZipBtn=$("downloadZipBtn"), statusText=$("statusText"), sidebar=$("sidebar");let currentFiles=[],activeIndex=0;function showToast(m){toast.textContent=m;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200)}function getHistory(){try{return JSON.parse(localStorage.getItem("codeforge_history")||"[]")}catch{return[]}}function saveHistory(p){p=p.trim();if(!p)return;let h=getHistory().filter(x=>x!==p);h.unshift(p);localStorage.setItem("codeforge_history",JSON.stringify(h.slice(0,15)));renderHistory()}function renderHistory(){let h=getHistory();historyList.innerHTML="";if(!h.length){historyList.innerHTML='<div class="history-empty">No recent searches yet.</div>';return}h.forEach(x=>{let b=document.createElement("button");b.className="history-item";b.title=x;b.textContent=x;b.onclick=()=>{promptInput.value=x;updateCount();sidebar.classList.remove("open");promptInput.focus()};historyList.appendChild(b)})}function updateCount(){$("charCount").textContent=`${promptInput.value.length} characters`}function setLoading(v){loading.classList.toggle("hidden",!v);generateBtn.disabled=v;generateBtn.querySelector("span:first-child").textContent=v?"Generating…":"Generate"}function renderFiles(files){currentFiles=files||[];fileTabs.innerHTML="";if(!currentFiles.length){fileArea.classList.add("hidden");return}fileArea.classList.remove("hidden");fileCount.textContent=`${currentFiles.length} file${currentFiles.length===1?"":"s"}`;currentFiles.forEach((f,i)=>{let b=document.createElement("button");b.className="file-tab";b.textContent=f.path;b.onclick=()=>selectFile(i);fileTabs.appendChild(b)});selectFile(0)}function selectFile(i){activeIndex=i;let f=currentFiles[i];if(!f)return;[...fileTabs.children].forEach((e,n)=>e.classList.toggle("active",n===i));activeFileName.textContent=f.path;codeView.textContent=f.content}async function generate(){let prompt=promptInput.value.trim();if(!prompt){showToast("Enter a development requirement first.");promptInput.focus();return}saveHistory(prompt);setLoading(true);resultSection.classList.add("hidden");try{let r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})}),d=await r.json();if(!r.ok)throw Error(d.error||"Generation failed.");resultSection.classList.remove("hidden");resultTitle.textContent=d.title||"Generated result";resultSummary.textContent=d.summary||"";if(d.answer){answerCard.textContent=d.answer;answerCard.classList.remove("hidden")}else answerCard.classList.add("hidden");renderFiles(d.files||[]);commandsList.innerHTML="";if((d.commands||[]).length){commandsArea.classList.remove("hidden");d.commands.forEach(c=>{let e=document.createElement("div");e.className="command";e.textContent=c;commandsList.appendChild(e)})}else commandsArea.classList.add("hidden");notesList.innerHTML="";if((d.notes||[]).length){notesArea.classList.remove("hidden");d.notes.forEach(n=>{let li=document.createElement("li");li.textContent=n;notesList.appendChild(li)})}else notesArea.classList.add("hidden");resultSection.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){resultSection.classList.remove("hidden");resultTitle.textContent="Generation error";resultSummary.textContent="";answerCard.textContent=e.message;answerCard.classList.remove("hidden");fileArea.classList.add("hidden");commandsArea.classList.add("hidden");notesArea.classList.add("hidden")}finally{setLoading(false)}}async function downloadZip(){if(!currentFiles.length){showToast("No generated files to package.");return}downloadZipBtn.disabled=true;downloadZipBtn.textContent="Preparing ZIP…";try{let r=await fetch("/api/download-zip",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({files:currentFiles})});if(!r.ok){let d=await r.json();throw Error(d.error||"ZIP creation failed.")}let blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="CodeForge_Project.zip";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("ZIP created successfully.")}catch(e){showToast(e.message)}finally{downloadZipBtn.disabled=false;downloadZipBtn.textContent="↓ Download ZIP"}}async function checkHealth(){try{let r=await fetch("/api/health"),d=await r.json(),online=d.ok&&d.gemini_configured;statusText.textContent=online?`Gemini ready · ${d.model}`:"API key required";document.querySelector(".status-dot").classList.toggle("online",online)}catch{statusText.textContent="Backend unavailable"}}promptInput.oninput=updateCount;promptInput.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();generate()}};generateBtn.onclick=generate;downloadZipBtn.onclick=downloadZip;copyCodeBtn.onclick=async()=>{let f=currentFiles[activeIndex];if(!f)return;try{await navigator.clipboard.writeText(f.content);showToast(`Copied ${f.path}`)}catch{showToast("Copy failed. Select the code manually.")}};document.querySelectorAll(".quick-card").forEach(b=>b.onclick=()=>{promptInput.value=b.dataset.prompt;updateCount();promptInput.focus()});$("newChatBtn").onclick=()=>{promptInput.value="";updateCount();resultSection.classList.add("hidden");promptInput.focus();sidebar.classList.remove("open")};$("clearHistoryBtn").onclick=()=>{localStorage.removeItem("codeforge_history");renderHistory();showToast("Recent searches cleared.")};$("menuBtn").onclick=()=>sidebar.classList.toggle("open");renderHistory();updateCount();checkHealth();

// Image upload and Gemini vision analysis
const imageInput = $("imageInput");
if (imageInput) {
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    $("imageFileName").textContent = file ? file.name : "No image selected";
    $("analyzeImageBtn").disabled = !file;
    if (file) {
      $("imagePreview").src = URL.createObjectURL(file);
      $("imagePreviewWrap").classList.remove("hidden");
    } else $("imagePreviewWrap").classList.add("hidden");
  });
  $("analyzeImageBtn").addEventListener("click", async () => {
    const file = imageInput.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("image", file);
    form.append("prompt", $("imagePrompt").value.trim());
    const btn = $("analyzeImageBtn");
    btn.disabled = true; btn.textContent = "Analyzing…"; setLoading(true);
    resultSection.classList.add("hidden");
    try {
      const response = await fetch("/api/analyze-image", {method:"POST", body:form});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image analysis failed.");
      resultSection.classList.remove("hidden");
      resultTitle.textContent = data.title || "Image analysis";
      resultSummary.textContent = data.summary || "";
      answerCard.textContent = data.answer || "";
      answerCard.classList.toggle("hidden", !data.answer);
      renderFiles(data.files || []);
      commandsList.innerHTML = "";
      (data.commands || []).forEach(x => { const el=document.createElement("div"); el.className="command"; el.textContent=x; commandsList.appendChild(el); });
      commandsArea.classList.toggle("hidden", !(data.commands || []).length);
      notesList.innerHTML = "";
      (data.notes || []).forEach(x => { const el=document.createElement("li"); el.textContent=x; notesList.appendChild(el); });
      notesArea.classList.toggle("hidden", !(data.notes || []).length);
      resultSection.scrollIntoView({behavior:"smooth"});
    } catch (err) {
      resultSection.classList.remove("hidden"); resultTitle.textContent="Image analysis error";
      answerCard.textContent=err.message; answerCard.classList.remove("hidden");
      fileArea.classList.add("hidden"); commandsArea.classList.add("hidden"); notesArea.classList.add("hidden");
    } finally { setLoading(false); btn.disabled=false; btn.textContent="Analyze image →"; }
  });
}
