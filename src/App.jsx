import { useState, useEffect, useRef, useCallback } from "react";

const GOOGLE_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap');`;

// ─── Storage Helpers (in-memory for artifact environment) ────────────────────
let _store = {};
function loadStore() { return _store; }
function saveStore(data) { _store = { ..._store, ...data }; }

// ─── Users (seeded if not present) ───────────────────────────────────────────
const DEFAULT_USERS = [
  { id: "mgr", name: "Field Manager", pin: "0000", role: "manager" },
  { id: "cs1", name: "Amanda M", pin: "1111", role: "specialist" },
  { id: "cs2", name: "Kaitlyn C", pin: "2222", role: "specialist" },
  { id: "cs3", name: "Jessica N", pin: "3333", role: "specialist" },
  { id: "cs4", name: "Lauren C", pin: "4444", role: "specialist" },
];
function getUsers() {
  const s = loadStore();
  if (!s.users) { s.users = DEFAULT_USERS; saveStore(s); }
  return s.users;
}
function getSessions() { return loadStore().sessions || []; }
function saveSession(session) {
  const s = loadStore();
  s.sessions = [session, ...(s.sessions || [])];
  saveStore(s);
}
function getUpcoming() { return loadStore().upcoming || []; }
function saveUpcoming(list) { const s = loadStore(); s.upcoming = list; saveStore(s); }

// ─── Checklists ───────────────────────────────────────────────────────────────
const COMMERCIAL_CHECKLIST = {
  "Hour 1": [
    { label: "Take before photos", note: "Document the space before touching anything", photoTrigger: "before" },
    { label: "Assess bathrooms and kitchen", note: "Note anything needing extra attention" },
    { label: "Sweep entire salon", note: "" },
    { label: "Vacuum 2 rugs — leave vacuum lines", note: "Straight, intentional lines" },
    { label: "Replace paper items in kitchen", note: "Paper towels, napkins, etc." },
    { label: "Wipe all kitchen surfaces & microwave", note: "Inside and outside of microwave" },
    { label: "Replace paper items in bathrooms", note: "Toilet paper, paper towels" },
    { label: "Wipe down sinks, mirrors & high-touch areas", note: "Door handles, light switches, counters" },
    { label: "Clean toilets", note: "Blue toilet cleaner + bleach spray · microfiber wipe" },
    { label: "High dust assigned section", note: "Vents, top of shelves, ceiling corners" },
  ],
  "Hour 2": [
    { label: "Clean baseboards — assigned section", note: "" },
    { label: "Empty 3 trash cans", note: "Kitchen + bathrooms + small women's stalls · bag in closet" },
    { label: "Mop / spot clean assigned section", note: "" },
    { label: "Put away mop and keys (if provided)", note: "" },
    { label: "Take after photos", note: "Match angles from before photos", photoTrigger: "after" },
    { label: "Take out trash", note: "Bring all bags to exterior bin" },
    { label: "Exit and lock property", note: "Double-check all doors and lights" },
  ],
};
const ROOM_TEMPLATES = {
  "Living Areas": ["Dust all surfaces & décor","Wipe down baseboards","Vacuum upholstery & cushions","Clean light switches & door handles","Vacuum or mop floors","Straighten furniture & pillows","Empty & reline trash","Clean windows & sills"],
  "Kitchen": ["Clean stovetop & burners","Wipe down countertops","Clean inside microwave","Wipe exterior of appliances","Clean sink & faucet","Wipe cabinet fronts & handles","Clean backsplash","Mop floor","Empty & reline trash","Wipe down table & chairs"],
  "Bathrooms": ["Scrub & disinfect toilet","Clean sink & faucet","Scrub tub / shower","Clean mirrors","Wipe down countertops","Clean light fixtures","Mop floor & around base of toilet","Replace towels if provided","Empty & reline trash","Restock supplies if needed"],
  "Bedrooms": ["Dust all surfaces & nightstands","Wipe baseboards","Clean light switches & door handles","Vacuum under bed & furniture","Vacuum or mop floors","Make bed / change linens if provided","Empty & reline trash","Clean mirrors"],
  "Entry & Hallways": ["Dust surfaces & shelving","Clean mirrors or artwork glass","Wipe light switches","Vacuum runner or mop floors","Clean front door interior","Wipe baseboards"],
  "Laundry Room": ["Wipe washer & dryer exteriors","Clean lint trap area","Wipe countertops & shelving","Mop floor","Empty trash"],
};

// ─── Scriptures ───────────────────────────────────────────────────────────────
const SCRIPTURES = [
  { text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.", ref: "Colossians 3:23" },
  { text: "And whatever you do, whether in word or deed, do it all in the name of the Lord Jesus.", ref: "Colossians 3:17" },
  { text: "Serve wholeheartedly, as if you were serving the Lord, not people.", ref: "Ephesians 6:7" },
  { text: "The one who is faithful in a very little is also faithful in much.", ref: "Luke 16:10" },
  { text: "She watches over the affairs of her household and does not eat the bread of idleness.", ref: "Proverbs 31:27" },
  { text: "Commit to the Lord whatever you do, and He will establish your plans.", ref: "Proverbs 16:3" },
];
function randomScripture() { return SCRIPTURES[Math.floor(Math.random() * SCRIPTURES.length)]; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function todayStr() { return new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }); }
function shortDate(iso) { return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }); }

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(session) {
  const w = window.open("", "_blank");
  const rows = session.jobType === "commercial"
    ? Object.entries(COMMERCIAL_CHECKLIST).map(([hour, items]) => {
        const done = items.filter((_, i) => session.checked[`${hour}-${i}`]).length;
        return `<tr><td>${hour}</td><td>${done}/${items.length}</td><td style="color:${done===items.length?"#8B7355":"#c0392b"}">${done===items.length?"✓ Complete":`${items.length-done} remaining`}</td></tr>`;
      }).join("")
    : (session.selectedRooms||[]).map(r => {
        const items = ROOM_TEMPLATES[r]||[];
        const done = items.filter((_,i) => session.checked[`${r}-${i}`]).length;
        return `<tr><td>${r}</td><td>${done}/${items.length}</td><td style="color:${done===items.length?"#8B7355":"#c0392b"}">${done===items.length?"✓ Complete":`${items.length-done} remaining`}</td></tr>`;
      }).join("");

  w.document.write(`<!DOCTYPE html><html><head><title>Clean Report — ${session.location}</title>
  <style>
    body{font-family:'Georgia',serif;background:#faf9f6;color:#1c1c1c;padding:48px;max-width:700px;margin:0 auto}
    h1{font-size:28px;font-weight:300;letter-spacing:0.04em;margin-bottom:4px}
    .sub{font-style:italic;color:#8B7355;margin-bottom:32px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{text-align:left;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#999;padding:8px 0;border-bottom:1px solid #e0ddd8}
    td{padding:10px 0;border-bottom:1px solid #f0ede8;font-size:14px;font-weight:300}
    .stat{display:inline-block;margin-right:32px;margin-bottom:16px}
    .stat-val{font-size:28px;font-weight:300;color:#1c1c1c}
    .stat-lbl{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#999;margin-top:2px}
    .sig{border-top:1px solid #1c1c1c;width:240px;margin-top:40px;padding-top:8px;font-size:11px;color:#999;letter-spacing:0.1em}
    .footer{margin-top:48px;font-style:italic;font-size:13px;color:#bbb;text-align:center}
    @media print{body{padding:32px}}
  </style></head><body>
  <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8B7355;margin-bottom:8px">Hidden Springs Cleaning Co.</div>
  <h1>${session.location}</h1>
  <div class="sub">${shortDate(session.date)} · ${session.jobType}</div>
  <div>
    <div class="stat"><div class="stat-val">${formatTime(session.elapsed)}</div><div class="stat-lbl">Duration</div></div>
    <div class="stat"><div class="stat-val">${Object.values(session.checked).filter(Boolean).length}/${session.totalItems}</div><div class="stat-lbl">Tasks</div></div>
    <div class="stat"><div class="stat-val">${(session.beforePhotos||[]).length + (session.afterPhotos||[]).length}</div><div class="stat-lbl">Photos</div></div>
  </div>
  <table><thead><tr><th>Area</th><th>Progress</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  ${session.notes ? `<p style="font-style:italic;color:#888;margin-top:24px">"${session.notes}"</p>` : ""}
  <div>
    <div class="stat-lbl" style="margin-bottom:8px">Clarity Specialist</div>
    <div style="font-size:16px">${session.teamMember||"—"}</div>
  </div>
  ${session.signature ? `<div style="margin-top:24px"><div class="stat-lbl" style="margin-bottom:8px">Field Manager Signature</div><img src="${session.signature}" style="max-width:280px;border:1px solid #e0ddd8;border-radius:4px"/></div>` : ""}
  <div class="footer">"Whatever you do, work at it with all your heart, as working for the Lord." — Col 3:23</div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ─── Email Report ─────────────────────────────────────────────────────────────
function emailReport(session) {
  const total = Object.values(session.checked).filter(Boolean).length;
  const body = encodeURIComponent(
`Hidden Springs Cleaning Co. — Session Report

Location: ${session.location}
Date: ${shortDate(session.date)}
Type: ${session.jobType}
Specialist: ${session.teamMember || "—"}

Duration: ${formatTime(session.elapsed)}
Tasks completed: ${total}/${session.totalItems}
Photos taken: ${(session.beforePhotos||[]).length + (session.afterPhotos||[]).length}

${session.notes ? `Notes: ${session.notes}\n` : ""}
"Whatever you do, work at it with all your heart, as working for the Lord." — Col 3:23

— Sent from the Hidden Springs Care App`
  );
  const subject = encodeURIComponent(`Clean Report — ${session.location} · ${shortDate(session.date)}`);
  window.open(`mailto:hiddenspringscleaningcompany@gmail.com?subject=${subject}&body=${body}`);
}

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef();
  const drawing = useRef(false);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };
  const start = (e) => { drawing.current = true; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e,c); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); };
  const move = (e) => { if (!drawing.current) return; const c = canvasRef.current; const ctx = c.getContext("2d"); const p = getPos(e,c); ctx.lineTo(p.x,p.y); ctx.strokeStyle="#F5F2EC"; ctx.lineWidth=2; ctx.lineCap="round"; ctx.stroke(); e.preventDefault(); };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current; c.getContext("2d").clearRect(0,0,c.width,c.height); };
  const save = () => onSave(canvasRef.current.toDataURL());

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20 }}>
      <div style={{ background:"#1A1A1A",borderRadius:12,border:"1px solid #2A2A2A",padding:24,width:"100%",maxWidth:400 }}>
        <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#9A9A8A",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12 }}>Field Manager Signature</div>
        <canvas ref={canvasRef} width={350} height={160}
          style={{ background:"#111",borderRadius:6,border:"1px solid #3A3A2A",touchAction:"none",display:"block",maxWidth:"100%",cursor:"crosshair" }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        <div style={{ display:"flex",gap:8,marginTop:14 }}>
          <button onClick={clear} style={{ flex:1,padding:"10px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:6,color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:12,cursor:"pointer" }}>Clear</button>
          <button onClick={onCancel} style={{ flex:1,padding:"10px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:6,color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:12,cursor:"pointer" }}>Cancel</button>
          <button onClick={save} style={{ flex:2,padding:"10px",background:"#C8B89A",border:"none",borderRadius:6,color:"#111",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:"pointer" }}>Save Signature</button>
        </div>
      </div>
    </div>
  );
}

// ─── PIN Login ────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const users = getUsers();

  const handlePin = (d) => {
    const next = (pin + d).slice(0, 4);
    setPin(next); setError("");
    if (next.length === 4) {
      if (next === selectedUser.pin) { onLogin(selectedUser); }
      else { setTimeout(() => { setPin(""); setError("Incorrect PIN"); }, 300); }
    }
  };

  return (
    <div style={{ minHeight:"100vh",background:"#111",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
      <style>{GOOGLE_FONTS}</style>
      <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#C8B89A",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:8 }}>Hidden Springs</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:300,color:"#F5F2EC",marginBottom:4,letterSpacing:"0.04em" }}>Cleaning Co.</div>
      <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:15,color:"#6A6A5A",marginBottom:40 }}>Care &amp; Presence</div>

      {!selectedUser ? (
        <div style={{ width:"100%",maxWidth:340 }}>
          <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#9A9A8A",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12,textAlign:"center" }}>Select your name</div>
          {users.map(u => (
            <button key={u.id} onClick={() => { setSelectedUser(u); setPin(""); setError(""); }} style={{
              width:"100%",marginBottom:8,padding:"14px 16px",
              background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"space-between",
            }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#FFFFFF" }}>{u.name}</span>
              <span style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#C8B89A",letterSpacing:"0.12em",textTransform:"uppercase",
                background:"#1E1E14",border:"1px solid #3A3020",borderRadius:20,padding:"3px 8px" }}>{u.role}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ width:"100%",maxWidth:300,textAlign:"center" }}>
          <button onClick={() => { setSelectedUser(null); setPin(""); }} style={{ background:"transparent",border:"none",color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer",marginBottom:16,letterSpacing:"0.1em" }}>← Back</button>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:"#FFFFFF",marginBottom:4 }}>{selectedUser.name}</div>
          <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#9A9A8A",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:24 }}>Enter PIN</div>
          <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:24 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width:14,height:14,borderRadius:"50%",background:pin.length>i?"#C8B89A":"#2A2A2A",transition:"background 0.2s" }} />
            ))}
          </div>
          {error && <div style={{ fontFamily:"'Inter',sans-serif",fontSize:12,color:"#c0392b",marginBottom:12 }}>{error}</div>}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:240,margin:"0 auto" }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i) => (
              <button key={i} onClick={() => { if(d==="") return; if(d==="⌫"){setPin(p=>p.slice(0,-1));setError("");}else handlePin(String(d)); }}
                style={{ padding:"16px 0",background:d===""?"transparent":"#1A1A1A",border:d===""?"none":"1px solid #2A2A2A",borderRadius:8,cursor:d===""?"default":"pointer",
                  fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#F5F2EC",transition:"background 0.15s" }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Breathing Ring ───────────────────────────────────────────────────────────
function BreathingRing({ isRunning, elapsed }) {
  const size=160, r=68, cx=80, cy=80, circ=2*Math.PI*r;
  return (
    <div style={{ position:"relative",width:size,height:size,margin:"0 auto" }}>
      <svg width={size} height={size} style={{ position:"absolute",top:0,left:0 }}>
        <defs><radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#C8B89A" stopOpacity="0.15"/><stop offset="100%" stopColor="#C8B89A" stopOpacity="0"/></radialGradient></defs>
        <circle cx={cx} cy={cy} r={r+10} fill="url(#rg)"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2E2E2E" strokeWidth="3"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#C8B89A" strokeWidth="2"
          strokeDasharray={circ} strokeDashoffset={isRunning ? circ-(circ*(elapsed%240))/240 : circ}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition:isRunning?"stroke-dashoffset 1s linear":"none",opacity:0.8 }}/>
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
        <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:300,color:"#FFFFFF",letterSpacing:"0.05em" }}>{formatTime(elapsed)}</span>
        <span style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#9A9A8A",letterSpacing:"0.15em",textTransform:"uppercase",marginTop:2 }}>{isRunning?"in care":"at rest"}</span>
      </div>
    </div>
  );
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────
function PhotoUpload({ label, photos, onAdd, autoOpen }) {
  const inputRef = useRef();
  useEffect(() => { if (autoOpen) { setTimeout(() => inputRef.current?.click(), 100); } }, [autoOpen]);

  const handleFile = (e) => {
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => onAdd({ src: ev.target.result, name: f.name });
      reader.readAsDataURL(f);
    });
  };

  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#9A9A8A",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-start" }}>
        {photos.map((p,i) => (
          <div key={i} style={{ width:64,height:64,borderRadius:4,overflow:"hidden",border:"1px solid #2E2E2E" }}>
            <img src={p.src} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          </div>
        ))}
        <button onClick={() => inputRef.current.click()} style={{
          width:64,height:64,borderRadius:4,border:"1px dashed #4A4A3A",background:"transparent",
          cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:4,color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:"0.08em",
        }}>
          <span style={{ fontSize:22,lineHeight:1,color:"#C8B89A" }}>+</span><span>Add</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple style={{ display:"none" }} onChange={handleFile}/>
    </div>
  );
}

// ─── Commercial Section ───────────────────────────────────────────────────────
function CommercialSection({ hour, items, checked, onToggle, onPhotoTrigger }) {
  const [open, setOpen] = useState(true);
  const done = items.filter((_,i) => checked[`${hour}-${i}`]).length;
  const pct = Math.round((done/items.length)*100);
  const isComplete = done===items.length && done>0;

  return (
    <div style={{ border:isComplete?"1px solid #3A3020":"1px solid #2A2A2A",borderRadius:8,marginBottom:10,background:open?"#1A1A1A":"#161616",overflow:"hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%",background:"transparent",border:"none",padding:"16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:28,height:28,borderRadius:"50%",background:isComplete?"#C8B89A":"#1E1E1E",border:isComplete?"none":"1px solid #3A3A2A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            {isComplete ? <span style={{ color:"#111",fontSize:13,fontWeight:600 }}>✓</span> : <span style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#6A6A5A" }}>{hour.replace("Hour ","")}</span>}
          </div>
          <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:21,fontWeight:400,color:"#FFFFFF",letterSpacing:"0.03em" }}>{hour}</span>
          {isComplete && <span style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#C8B89A",letterSpacing:"0.1em" }}>complete</span>}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#9A9A8A" }}>{done}/{items.length}</span>
          <div style={{ width:44,height:3,background:"#2E2E2E",borderRadius:2,overflow:"hidden" }}>
            <div style={{ width:`${pct}%`,height:"100%",background:"#C8B89A",transition:"width 0.4s ease" }}/>
          </div>
          <span style={{ color:"#9A9A8A",fontSize:13,transform:open?"rotate(180deg)":"none",transition:"transform 0.3s",display:"inline-block" }}>⌄</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"0 16px 14px" }}>
          {items.map((item,i) => {
            const key=`${hour}-${i}`, isDone=!!checked[key];
            return (
              <label key={i} style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderBottom:i<items.length-1?"1px solid #1E1E1E":"none",cursor:"pointer" }}>
                <div style={{ width:22,height:22,borderRadius:"50%",marginTop:1,border:isDone?"none":"1.5px solid #4A4A3A",background:isDone?"#C8B89A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s" }}>
                  {isDone && <span style={{ color:"#1C1C1C",fontSize:11,fontWeight:700 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:300,color:isDone?"#4A4A3A":"#FFFFFF",textDecoration:isDone?"line-through":"none",letterSpacing:"0.01em",lineHeight:1.4,transition:"color 0.2s" }}>{item.label}</div>
                  {item.note && !isDone && <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:12,color:"#5A5A4A",marginTop:2 }}>{item.note}</div>}
                  {item.photoTrigger && !isDone && <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#C8B89A",letterSpacing:"0.1em",marginTop:4 }}>→ Opens camera</div>}
                </div>
                <input type="checkbox" style={{ display:"none" }} checked={isDone} onChange={() => { onToggle(key); if(!isDone && item.photoTrigger) onPhotoTrigger(item.photoTrigger); }}/>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Room Section ─────────────────────────────────────────────────────────────
function RoomSection({ room, items, checked, onToggle }) {
  const [open, setOpen] = useState(false);
  const done = items.filter((_,i) => checked[`${room}-${i}`]).length;
  const pct = Math.round((done/items.length)*100);
  return (
    <div style={{ border:"1px solid #2A2A2A",borderRadius:8,marginBottom:8,background:open?"#1A1A1A":"#161616",overflow:"hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontWeight:400,color:"#FFFFFF",letterSpacing:"0.03em" }}>{room}</span>
          {done===items.length && done>0 && <span style={{ fontSize:11,color:"#C8B89A",fontFamily:"'Inter',sans-serif",letterSpacing:"0.1em" }}>✓ Complete</span>}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#9A9A8A" }}>{done}/{items.length}</span>
          <div style={{ width:40,height:3,background:"#2E2E2E",borderRadius:2,overflow:"hidden" }}><div style={{ width:`${pct}%`,height:"100%",background:"#C8B89A",transition:"width 0.4s ease" }}/></div>
          <span style={{ color:"#9A9A8A",fontSize:13,transform:open?"rotate(180deg)":"none",transition:"transform 0.3s",display:"inline-block" }}>⌄</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"0 16px 14px" }}>
          {items.map((item,i) => {
            const key=`${room}-${i}`, isDone=!!checked[key];
            return (
              <label key={i} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<items.length-1?"1px solid #222":"none",cursor:"pointer" }}>
                <div style={{ width:20,height:20,borderRadius:"50%",border:isDone?"none":"1.5px solid #4A4A3A",background:isDone?"#C8B89A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s" }}>
                  {isDone && <span style={{ color:"#1C1C1C",fontSize:11,fontWeight:600 }}>✓</span>}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:300,color:isDone?"#5A5A4A":"#FFFFFF",textDecoration:isDone?"line-through":"none",letterSpacing:"0.01em",lineHeight:1.4,transition:"color 0.2s" }}>{item}</span>
                <input type="checkbox" style={{ display:"none" }} checked={isDone} onChange={() => onToggle(key)}/>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Specialists Tab (Manager only) ──────────────────────────────────────────
function SpecialistsTab() {
  const users = getUsers().filter(u => u.role === "specialist");
  const sessions = getSessions();
  const upcoming = getUpcoming();
  const [expanded, setExpanded] = useState(null);

  const getSpecialistStats = (userId) => {
    const userSessions = sessions.filter(s => s.userId === userId);
    const lastClean = userSessions[0] || null;
    const totalCleans = userSessions.length;
    const avgTasks = totalCleans > 0
      ? Math.round(userSessions.reduce((a, s) => a + (Object.values(s.checked||{}).filter(Boolean).length), 0) / totalCleans)
      : 0;
    const nextClean = upcoming.find(u => u.assignedTo === userId) || null;
    return { userSessions, lastClean, totalCleans, avgTasks, nextClean };
  };

  return (
    <div>
      {/* Sync notice */}
      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,marginBottom:16 }}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:"#5A5A3A",flexShrink:0 }}/>
        <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#6A6A5A",letterSpacing:"0.06em" }}>
          Live sync requires a backend connection. Showing saved session data.
        </span>
      </div>

      {users.map(u => {
        const { userSessions, lastClean, totalCleans, avgTasks, nextClean } = getSpecialistStats(u.id);
        const isOpen = expanded === u.id;

        return (
          <div key={u.id} style={{ border:"1px solid #2A2A2A",borderRadius:10,marginBottom:12,background:"#161616",overflow:"hidden" }}>
            {/* Header row */}
            <button onClick={() => setExpanded(isOpen ? null : u.id)}
              style={{ width:"100%",background:"transparent",border:"none",padding:"16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"#1E1E1E",border:"1px solid #3A3A2A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:"#C8B89A" }}>{u.name.charAt(0)}</span>
                </div>
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#FFFFFF",letterSpacing:"0.02em" }}>{u.name}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#6A6A5A",marginTop:1,letterSpacing:"0.1em" }}>
                    {totalCleans} clean{totalCleans !== 1 ? "s" : ""} completed
                  </div>
                </div>
              </div>
              <span style={{ color:"#9A9A8A",fontSize:14,transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.3s",display:"inline-block" }}>⌄</span>
            </button>

            {isOpen && (
              <div style={{ padding:"0 16px 16px" }}>
                {/* Stats row */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16 }}>
                  {[
                    { v: String(totalCleans), l: "Total Cleans" },
                    { v: totalCleans > 0 ? formatTime(Math.round(userSessions.reduce((a,s)=>a+(s.elapsed||0),0)/totalCleans)) : "—", l: "Avg Duration" },
                    { v: totalCleans > 0 ? String(avgTasks) : "—", l: "Avg Tasks" },
                  ].map(({v,l}) => (
                    <div key={l} style={{ background:"#1A1A1A",borderRadius:6,border:"1px solid #222",padding:"10px 8px",textAlign:"center" }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:"#F5F2EC" }}>{v}</div>
                      <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#6A6A5A",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Next scheduled */}
                {nextClean && (
                  <div style={{ background:"#1A1A1A",border:"1px solid #3A3020",borderRadius:8,padding:"12px 14px",marginBottom:12 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#C8B89A",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:4 }}>Next Scheduled</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#FFFFFF" }}>{nextClean.location}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#6A6A5A",marginTop:2 }}>{shortDate(nextClean.date)} · {nextClean.type}</div>
                  </div>
                )}

                {/* Recent cleans */}
                {userSessions.length === 0 ? (
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:14,color:"#3A3A2A",textAlign:"center",padding:"12px 0" }}>No completed cleans yet.</div>
                ) : (
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#6A6A5A",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8 }}>Recent Cleans</div>
                    {userSessions.slice(0,5).map((s,i) => {
                      const done = Object.values(s.checked||{}).filter(Boolean).length;
                      const pct = s.totalItems > 0 ? Math.round((done/s.totalItems)*100) : 0;
                      return (
                        <div key={i} style={{ padding:"10px 0",borderBottom:i<Math.min(userSessions.length,5)-1?"1px solid #1E1E1E":"none" }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                            <div>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:"#F0EEE8" }}>{s.location}</div>
                              <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#5A5A4A",marginTop:1 }}>{shortDate(s.date)} · {formatTime(s.elapsed)}</div>
                            </div>
                            <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:pct===100?"#C8B89A":"#9A9A8A" }}>{pct}%</span>
                          </div>
                          {/* task progress bar */}
                          <div style={{ height:2,background:"#222",borderRadius:1,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:"#C8B89A",borderRadius:1 }}/>
                          </div>
                          {/* checklist detail */}
                          <div style={{ marginTop:8,display:"flex",flexWrap:"wrap",gap:4 }}>
                            {s.jobType === "commercial"
                              ? Object.entries(COMMERCIAL_CHECKLIST).map(([hour, items]) => {
                                  const hDone = items.filter((_,idx) => s.checked?.[`${hour}-${idx}`]).length;
                                  return (
                                    <span key={hour} style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:hDone===items.length?"#C8B89A":"#5A5A4A",background:"#1E1E1E",padding:"2px 8px",borderRadius:10,border:`1px solid ${hDone===items.length?"#3A3020":"#2A2A2A"}` }}>
                                      {hour}: {hDone}/{items.length}
                                    </span>
                                  );
                                })
                              : (s.selectedRooms||[]).map(r => {
                                  const rItems = ROOM_TEMPLATES[r]||[];
                                  const rDone = rItems.filter((_,idx) => s.checked?.[`${r}-${idx}`]).length;
                                  return (
                                    <span key={r} style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:rDone===rItems.length?"#C8B89A":"#5A5A4A",background:"#1E1E1E",padding:"2px 8px",borderRadius:10,border:`1px solid ${rDone===rItems.length?"#3A3020":"#2A2A2A"}` }}>
                                      {r}: {rDone}/{rItems.length}
                                    </span>
                                  );
                                })
                            }
                          </div>
                          <div style={{ display:"flex",gap:6,marginTop:8 }}>
                            <button onClick={() => exportPDF(s)} style={{ padding:"5px 10px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:5,color:"#7A7A6A",fontFamily:"'Inter',sans-serif",fontSize:10,cursor:"pointer",letterSpacing:"0.08em" }}>PDF</button>
                            <button onClick={() => emailReport(s)} style={{ padding:"5px 10px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:5,color:"#7A7A6A",fontFamily:"'Inter',sans-serif",fontSize:10,cursor:"pointer",letterSpacing:"0.08em" }}>Email</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── History & Upcoming Tab ───────────────────────────────────────────────────
function HistoryTab({ currentUser, onNewClean }) {
  const [view, setView] = useState("history");
  const [showAddUpcoming, setShowAddUpcoming] = useState(false);
  const [upcoming, setUpcoming] = useState(getUpcoming());
  const [sessions, setSessions] = useState(getSessions());
  const [newJob, setNewJob] = useState({ date:"", location:"", type:"commercial", assignedTo:"" });

  const users = getUsers().filter(u => u.role==="specialist");
  const isManager = currentUser.role === "manager";

  // Filter sessions for specialists
  const visibleSessions = isManager ? sessions : sessions.filter(s => s.userId === currentUser.id);
  const visibleUpcoming = isManager ? upcoming : upcoming.filter(u => u.assignedTo === currentUser.id || !u.assignedTo);

  const addUpcoming = () => {
    if (!newJob.date || !newJob.location) return;
    const list = [...upcoming, { ...newJob, id: Date.now() }];
    saveUpcoming(list); setUpcoming(list); setShowAddUpcoming(false);
    setNewJob({ date:"", location:"", type:"commercial", assignedTo:"" });
  };

  const removeUpcoming = (id) => { const list = upcoming.filter(u => u.id!==id); saveUpcoming(list); setUpcoming(list); };

  const inp = { width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,padding:"11px 14px",color:"#F5F2EC",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:300,outline:"none",boxSizing:"border-box" };
  const lbl = { fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:"0.14em",color:"#9A9A8A",textTransform:"uppercase",marginBottom:6,display:"block" };

  return (
    <div>
      <div style={{ display:"flex",gap:0,marginBottom:16,background:"#161616",borderRadius:8,padding:3 }}>
        {["history","upcoming"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex:1,padding:"9px",background:view===v?"#2A2A2A":"transparent",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:11,color:view===v?"#F5F2EC":"#6A6A5A",letterSpacing:"0.1em",textTransform:"capitalize",transition:"all 0.2s" }}>{v}</button>
        ))}
      </div>

      {view === "history" && (
        <div>
          {visibleSessions.length === 0 && (
            <div style={{ textAlign:"center",padding:"40px 0",fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:16,color:"#4A4A3A" }}>No completed cleans yet.</div>
          )}
          {visibleSessions.map((s,i) => {
            const done = Object.values(s.checked||{}).filter(Boolean).length;
            return (
              <div key={i} style={{ background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,padding:16,marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:"#FFFFFF" }}>{s.location}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#6A6A5A",marginTop:2 }}>{shortDate(s.date)} · {s.jobType}</div>
                    {isManager && s.teamMember && <div style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#C8B89A",marginTop:2 }}>{s.teamMember}</div>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:"#FFFFFF" }}>{formatTime(s.elapsed)}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#6A6A5A",letterSpacing:"0.1em",textTransform:"uppercase" }}>duration</div>
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#9A9A8A",background:"#1E1E1E",padding:"3px 8px",borderRadius:12,border:"1px solid #2A2A2A" }}>{done}/{s.totalItems} tasks</span>
                  <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#9A9A8A",background:"#1E1E1E",padding:"3px 8px",borderRadius:12,border:"1px solid #2A2A2A" }}>{(s.beforePhotos||[]).length+(s.afterPhotos||[]).length} photos</span>
                </div>
                <div style={{ display:"flex",gap:8,marginTop:10 }}>
                  <button onClick={() => exportPDF(s)} style={{ flex:1,padding:"8px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:6,color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer",letterSpacing:"0.08em" }}>Export PDF</button>
                  <button onClick={() => emailReport(s)} style={{ flex:1,padding:"8px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:6,color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer",letterSpacing:"0.08em" }}>Email Report</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "upcoming" && (
        <div>
          {isManager && (
            <button onClick={() => setShowAddUpcoming(true)} style={{ width:"100%",padding:"12px",background:"transparent",border:"1px dashed #3A3A2A",borderRadius:8,color:"#C8B89A",fontFamily:"'Cormorant Garamond',serif",fontSize:16,cursor:"pointer",marginBottom:14,letterSpacing:"0.04em" }}>+ Schedule a Clean</button>
          )}
          {visibleUpcoming.length === 0 && (
            <div style={{ textAlign:"center",padding:"40px 0",fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:16,color:"#4A4A3A" }}>No upcoming cleans scheduled.</div>
          )}
          {visibleUpcoming.map((u,i) => {
            const assignedUser = getUsers().find(usr => usr.id === u.assignedTo);
            return (
              <div key={i} style={{ background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,padding:16,marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:"#FFFFFF" }}>{u.location}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#6A6A5A",marginTop:2 }}>{shortDate(u.date)} · {u.type}</div>
                    {assignedUser && <div style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#C8B89A",marginTop:2 }}>{assignedUser.name}</div>}
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={() => onNewClean(u)} style={{ padding:"7px 12px",background:"#C8B89A",border:"none",borderRadius:6,color:"#111",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer" }}>Start</button>
                    {isManager && <button onClick={() => removeUpcoming(u.id)} style={{ padding:"7px 10px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:6,color:"#6A6A5A",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer" }}>✕</button>}
                  </div>
                </div>
              </div>
            );
          })}

          {showAddUpcoming && (
            <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000 }}>
              <div style={{ background:"#1A1A1A",borderRadius:"12px 12px 0 0",border:"1px solid #2A2A2A",padding:24,width:"100%",maxWidth:480 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#F5F2EC",marginBottom:20 }}>Schedule a Clean</div>
                <div style={{ marginBottom:14 }}><label style={lbl}>Date</label><input type="date" style={inp} value={newJob.date} onChange={e => setNewJob({...newJob,date:e.target.value})}/></div>
                <div style={{ marginBottom:14 }}><label style={lbl}>Location</label><input style={inp} placeholder="Client / address" value={newJob.location} onChange={e => setNewJob({...newJob,location:e.target.value})}/></div>
                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>Type</label>
                  <div style={{ display:"flex",gap:8 }}>
                    {["commercial","residential"].map(t => (
                      <button key={t} onClick={() => setNewJob({...newJob,type:t})} style={{ flex:1,padding:"10px",background:newJob.type===t?"#C8B89A":"#1A1A1A",border:newJob.type===t?"none":"1px solid #2A2A2A",borderRadius:6,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,color:newJob.type===t?"#111":"#9A9A8A",letterSpacing:"0.08em" }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:20 }}>
                  <label style={lbl}>Assign to</label>
                  <select style={{ ...inp,appearance:"none" }} value={newJob.assignedTo} onChange={e => setNewJob({...newJob,assignedTo:e.target.value})}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={() => setShowAddUpcoming(false)} style={{ flex:1,padding:"12px",background:"transparent",border:"1px solid #2A2A2A",borderRadius:8,color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:13,cursor:"pointer" }}>Cancel</button>
                  <button onClick={addUpcoming} style={{ flex:2,padding:"12px",background:"#C8B89A",border:"none",borderRadius:8,color:"#111",fontFamily:"'Cormorant Garamond',serif",fontSize:18,cursor:"pointer" }}>Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [phase, setPhase] = useState("setup");
  const [jobType, setJobType] = useState("commercial");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checked, setChecked] = useState({});
  const [beforePhotos, setBeforePhotos] = useState([]);
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist");
  const [photoAutoOpen, setPhotoAutoOpen] = useState(null); // "before"|"after"|null
  const [showSigPad, setShowSigPad] = useState(false);
  const [signature, setSignature] = useState(null);
  const [scripture] = useState(randomScripture());
  const [mainTab, setMainTab] = useState("session"); // "session"|"cleans"|"specialists"
  const isManager = currentUser?.role === "manager";
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) { intervalRef.current = setInterval(() => setElapsed(e => e+1), 1000); }
    else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Clear autoOpen after a tick so it only fires once
  useEffect(() => { if (photoAutoOpen) { const t = setTimeout(() => setPhotoAutoOpen(null), 500); return () => clearTimeout(t); } }, [photoAutoOpen]);

  const commercialHours = Object.keys(COMMERCIAL_CHECKLIST);
  const allRooms = Object.keys(ROOM_TEMPLATES);
  const totalItems = jobType==="commercial"
    ? commercialHours.reduce((a,h) => a+COMMERCIAL_CHECKLIST[h].length, 0)
    : selectedRooms.reduce((a,r) => a+(ROOM_TEMPLATES[r]?.length||0), 0);
  const doneItems = Object.values(checked).filter(Boolean).length;
  const overallPct = totalItems>0 ? Math.round((doneItems/totalItems)*100) : 0;
  const canStart = location.trim().length>0 && (jobType==="commercial" || selectedRooms.length>0);

  const handlePhotoTrigger = (type) => { setActiveTab("photos"); setPhotoAutoOpen(type); };
  const toggleCheck = (key) => setChecked(p => ({...p,[key]:!p[key]}));

  const startSession = (prefill) => {
    if (prefill) { setJobType(prefill.type||"commercial"); setLocation(prefill.location||""); }
    setPhase("active"); setIsRunning(true); setActiveTab("checklist");
  };

  const completeSession = () => {
    setIsRunning(false);
    const session = {
      id: Date.now(), userId: currentUser.id, teamMember: currentUser.name,
      location, jobType, notes, checked, selectedRooms, totalItems,
      beforePhotos, afterPhotos, elapsed, signature,
      date: new Date().toISOString(),
    };
    saveSession(session);
    setPhase("complete");
  };

  const resetSession = () => {
    setPhase("setup"); setChecked({}); setElapsed(0); setBeforePhotos([]); setAfterPhotos([]);
    setLocation(""); setNotes(""); setSelectedRooms([]); setSignature(null); setIsRunning(false);
  };

  const S = {
    app: { minHeight:"100vh",background:"#111",fontFamily:"'Inter',sans-serif",color:"#F5F2EC",maxWidth:480,margin:"0 auto",position:"relative" },
    inp: { width:"100%",background:"#1A1A1A",border:"1px solid #2A2A2A",borderRadius:6,padding:"12px 14px",color:"#F5F2EC",fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:300,outline:"none",boxSizing:"border-box",letterSpacing:"0.02em" },
    lbl: { fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:"0.14em",color:"#9A9A8A",textTransform:"uppercase",marginBottom:6,display:"block" },
    btn: { width:"100%",padding:"16px",background:"#C8B89A",color:"#111",border:"none",borderRadius:8,fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:400,letterSpacing:"0.06em",cursor:"pointer" },
    tab: (a) => ({ flex:1,padding:"12px 4px",background:"transparent",border:"none",borderBottom:a?"2px solid #C8B89A":"2px solid transparent",color:a?"#F5F2EC":"#5A5A4A",fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",transition:"all 0.2s" }),
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser}/>;

  // ── MAIN SHELL ───────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{GOOGLE_FONTS}</style>

      {/* Top nav */}
      <div style={{ background:"#111",borderBottom:"1px solid #1A1A1A",padding:"16px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#C8B89A",letterSpacing:"0.18em",textTransform:"uppercase" }}>Hidden Springs</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:"#F5F2EC",letterSpacing:"0.04em" }}>Cleaning Co.</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10,paddingBottom:4 }}>
          <span style={{ fontFamily:"'Inter',sans-serif",fontSize:11,color:"#6A6A5A" }}>{currentUser.name}</span>
          <button onClick={() => setCurrentUser(null)} style={{ background:"transparent",border:"1px solid #2A2A2A",borderRadius:20,padding:"4px 10px",color:"#6A6A5A",fontFamily:"'Inter',sans-serif",fontSize:10,cursor:"pointer",letterSpacing:"0.08em" }}>Sign out</button>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display:"flex",background:"#111",borderBottom:"1px solid #1E1E1E" }}>
        <button onClick={() => setMainTab("session")} style={{ ...S.tab(mainTab==="session"),flex:1,padding:"12px 8px" }}>Current Clean</button>
        <button onClick={() => setMainTab("cleans")} style={{ ...S.tab(mainTab==="cleans"),flex:1,padding:"12px 8px" }}>All Cleans</button>
        {isManager && <button onClick={() => setMainTab("specialists")} style={{ ...S.tab(mainTab==="specialists"),flex:1,padding:"12px 8px" }}>Specialists</button>}
      </div>

      {/* ── ALL CLEANS TAB ── */}
      {mainTab === "cleans" && (
        <div style={{ padding:20,paddingBottom:40 }}>
          <HistoryTab currentUser={currentUser} onNewClean={(prefill) => { setMainTab("session"); startSession(prefill); }}/>
        </div>
      )}

      {/* ── SPECIALISTS TAB (manager only) ── */}
      {mainTab === "specialists" && isManager && (
        <div style={{ padding:20,paddingBottom:40 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:"#F5F2EC",marginBottom:4 }}>Clarity Specialists</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:14,color:"#6A6A5A",marginBottom:20 }}>Session history &amp; performance for each team member</div>
          <SpecialistsTab />
        </div>
      )}

      {/* ── SESSION TAB ── */}
      {mainTab === "session" && (
        <>
          {/* SETUP */}
          {phase === "setup" && (
            <div style={{ padding:20 }}>
              <div style={{ marginBottom:20 }}>
                <span style={S.lbl}>Type of service</span>
                <div style={{ display:"flex",gap:8 }}>
                  {["commercial","residential"].map(t => (
                    <button key={t} onClick={() => setJobType(t)} style={{ flex:1,padding:"12px 8px",background:jobType===t?"#C8B89A":"#1A1A1A",border:jobType===t?"none":"1px solid #2A2A2A",borderRadius:6,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,color:jobType===t?"#111":"#9A9A8A",letterSpacing:"0.1em",textTransform:"capitalize" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:20 }}><label style={S.lbl}>Location / Client name</label><input style={S.inp} placeholder="e.g. The Johnson Salon · 123 Main St" value={location} onChange={e => setLocation(e.target.value)}/></div>
              {jobType==="residential" && (
                <div style={{ marginBottom:20 }}>
                  <span style={S.lbl}>Select rooms</span>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                    {allRooms.map(r => { const a=selectedRooms.includes(r); return (
                      <button key={r} onClick={() => setSelectedRooms(p => a?p.filter(x=>x!==r):[...p,r])} style={{ padding:"8px 14px",background:a?"#1E1E18":"#161616",border:a?"1px solid #C8B89A":"1px solid #2A2A2A",borderRadius:20,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:12,color:a?"#C8B89A":"#6A6A5A",letterSpacing:"0.06em",transition:"all 0.2s" }}>{r}</button>
                    );})}
                  </div>
                </div>
              )}
              {jobType==="commercial" && (
                <div style={{ marginBottom:20,padding:"14px 16px",background:"#161616",border:"1px solid #2A2A2A",borderRadius:8 }}>
                  <div style={S.lbl}>Checklist included</div>
                  <div style={{ display:"flex",gap:8 }}>
                    {commercialHours.map(h => (
                      <div key={h} style={{ flex:1,padding:"10px 12px",background:"#1A1A1A",borderRadius:6,border:"1px solid #2A2A2A" }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:"#F5F2EC" }}>{h}</div>
                        <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#6A6A5A",marginTop:2 }}>{COMMERCIAL_CHECKLIST[h].length} tasks</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom:28 }}><label style={S.lbl}>Special notes</label><textarea style={{ ...S.inp,height:72,resize:"none",lineHeight:1.5 }} placeholder="Requests, access notes, focus areas..." value={notes} onChange={e => setNotes(e.target.value)}/></div>
              <button onClick={() => startSession(null)} disabled={!canStart} style={{ ...S.btn,opacity:canStart?1:0.4,cursor:canStart?"pointer":"not-allowed" }}>Begin Caring for This Space</button>
              {!canStart && <p style={{ textAlign:"center",marginTop:10,fontFamily:"'Inter',sans-serif",fontSize:11,color:"#4A4A3A",letterSpacing:"0.06em" }}>{jobType==="commercial"?"Add a location to begin":"Add a location and select at least one room"}</p>}
            </div>
          )}

          {/* ACTIVE */}
          {phase === "active" && (
            <>
              <div style={{ padding:"16px 20px 0",borderBottom:"1px solid #1E1E1E" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#C8B89A",letterSpacing:"0.16em",textTransform:"uppercase" }}>{jobType}</div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#FFFFFF",lineHeight:1.3 }}>{location}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:300,color:overallPct===100?"#C8B89A":"#F5F2EC" }}>{overallPct}%</div>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#6A6A5A",letterSpacing:"0.12em",textTransform:"uppercase" }}>complete</div>
                  </div>
                </div>
                <div style={{ height:2,background:"#1E1E1E",borderRadius:1,margin:"12px 0 0",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${overallPct}%`,background:"#C8B89A",transition:"width 0.5s ease" }}/>
                </div>
                <div style={{ display:"flex" }}>
                  {["checklist","timer","photos","sign"].map(t => (
                    <button key={t} style={S.tab(activeTab===t)} onClick={() => setActiveTab(t)}>{t==="sign"?"sign off":t}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding:"20px 16px",paddingBottom:100 }}>
                {activeTab==="checklist" && (
                  <div>
                    {jobType==="commercial"
                      ? commercialHours.map(h => <CommercialSection key={h} hour={h} items={COMMERCIAL_CHECKLIST[h]} checked={checked} onToggle={toggleCheck} onPhotoTrigger={handlePhotoTrigger}/>)
                      : selectedRooms.map(r => <RoomSection key={r} room={r} items={ROOM_TEMPLATES[r].map(x=>x)} checked={checked} onToggle={toggleCheck}/>)
                    }
                    {notes && <div style={{ marginTop:16,padding:"14px 16px",background:"#161616",border:"1px solid #2A2A2A",borderRadius:8 }}><div style={S.lbl}>Session notes</div><p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:17,color:"#C8C4BC",lineHeight:1.5,margin:0 }}>{notes}</p></div>}
                  </div>
                )}

                {activeTab==="timer" && (
                  <div style={{ textAlign:"center",paddingTop:20 }}>
                    <div style={{ marginBottom:10,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:15,color:"#6A6A5A" }}>{isRunning?"Present and caring for this space":"Take a breath — you can pause anytime"}</div>
                    <BreathingRing isRunning={isRunning} elapsed={elapsed}/>
                    <div style={{ display:"flex",gap:12,justifyContent:"center",marginTop:28 }}>
                      <button onClick={() => setIsRunning(r=>!r)} style={{ padding:"14px 32px",background:isRunning?"#1A1A1A":"#C8B89A",border:isRunning?"1px solid #3A3A2A":"none",borderRadius:8,cursor:"pointer",fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:isRunning?"#9A9A8A":"#111",letterSpacing:"0.06em" }}>{isRunning?"Pause":"Resume"}</button>
                    </div>
                    <div style={{ marginTop:32,padding:"18px 20px",background:"#141414",borderRadius:8,border:"1px solid #1E1E1E" }}>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:16,color:"#7A7A6A",lineHeight:1.6,margin:0 }}>"{scripture.text}"</p>
                      <p style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#4A4A3A",letterSpacing:"0.12em",marginTop:8,textTransform:"uppercase" }}>{scripture.ref}</p>
                    </div>
                    <div style={{ marginTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                      {[{val:doneItems,lbl:"Tasks done"},{val:totalItems-doneItems,lbl:"Remaining"}].map(({val,lbl}) => (
                        <div key={lbl} style={{ padding:16,background:"#161616",borderRadius:8,border:"1px solid #1E1E1E" }}>
                          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:300,color:"#FFFFFF" }}>{val}</div>
                          <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#6A6A5A",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2 }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab==="photos" && (
                  <div>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:15,color:"#6A6A5A",marginBottom:20,lineHeight:1.5 }}>Document the care you've given — before and after.</p>
                    <PhotoUpload label="Before" photos={beforePhotos} onAdd={p => setBeforePhotos(prev=>[...prev,p])} autoOpen={photoAutoOpen==="before"}/>
                    <div style={{ height:1,background:"#1E1E1E",margin:"16px 0" }}/>
                    <PhotoUpload label="After" photos={afterPhotos} onAdd={p => setAfterPhotos(prev=>[...prev,p])} autoOpen={photoAutoOpen==="after"}/>
                    <div style={{ marginTop:16,padding:"12px 14px",background:"#161616",border:"1px solid #2A2A2A",borderRadius:8 }}>
                      <div style={S.lbl}>Photo summary</div>
                      <p style={{ fontFamily:"'Inter',sans-serif",fontSize:13,color:"#6A6A5A",margin:0 }}>{beforePhotos.length} before · {afterPhotos.length} after</p>
                    </div>
                  </div>
                )}

                {activeTab==="sign" && (
                  <div>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:15,color:"#6A6A5A",marginBottom:20,lineHeight:1.5 }}>Collect a field manager signature to finalize this clean.</p>
                    {signature ? (
                      <div style={{ marginBottom:20 }}>
                        <div style={S.lbl}>Signature captured</div>
                        <img src={signature} style={{ maxWidth:"100%",borderRadius:6,border:"1px solid #2A2A2A",background:"#111" }}/>
                        <button onClick={() => setSignature(null)} style={{ marginTop:8,background:"transparent",border:"none",color:"#9A9A8A",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer",letterSpacing:"0.1em" }}>Clear signature</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowSigPad(true)} style={{ width:"100%",padding:"32px",background:"#161616",border:"1px dashed #3A3A2A",borderRadius:8,cursor:"pointer",fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:"#6A6A5A",letterSpacing:"0.04em",marginBottom:20 }}>
                        Tap to collect signature
                      </button>
                    )}
                    <div style={{ background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,padding:16,marginBottom:16 }}>
                      <div style={S.lbl}>Session at a glance</div>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center" }}>
                        {[{v:formatTime(elapsed),l:"Time"},{v:`${doneItems}/${totalItems}`,l:"Tasks"},{v:`${beforePhotos.length+afterPhotos.length}`,l:"Photos"}].map(({v,l}) => (
                          <div key={l}><div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:"#FFFFFF" }}>{v}</div><div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#6A6A5A",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2 }}>{l}</div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:"12px 16px 24px",background:"linear-gradient(to top,#111 80%,transparent)",boxSizing:"border-box" }}>
                <button onClick={completeSession} style={{ ...S.btn,marginTop:0,background:overallPct===100?"#C8B89A":"#1E1E1E",color:overallPct===100?"#111":"#6A6A5A",border:overallPct===100?"none":"1px solid #2A2A2A" }}>
                  {overallPct===100?"Complete this Clean":`Finish Early · ${overallPct}% complete`}
                </button>
              </div>
            </>
          )}

          {/* COMPLETE */}
          {phase === "complete" && (() => {
            const session = getSessions()[0];
            return (
              <div style={{ paddingBottom:60 }}>
                <div style={{ padding:"48px 20px 24px",textAlign:"center" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:48,color:"#C8B89A",marginBottom:8 }}>✦</div>
                  <div style={{ fontFamily:"'Inter',sans-serif",fontSize:10,color:"#C8B89A",letterSpacing:"0.16em",textTransform:"uppercase" }}>Well done</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:300,color:"#F5F2EC",marginTop:6,lineHeight:1.3 }}>This space has been cared for.</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:15,color:"#7A7A6A",marginTop:8 }}>Peace was brought to {location}.</div>
                </div>
                <div style={{ padding:"0 20px" }}>
                  <div style={{ background:"#161616",border:"1px solid #2A2A2A",borderRadius:10,padding:20,marginBottom:14 }}>
                    <div style={S.lbl}>Session summary</div>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,textAlign:"center" }}>
                      {[{v:formatTime(elapsed),l:"Duration"},{v:`${doneItems}/${totalItems}`,l:"Tasks"},{v:`${beforePhotos.length+afterPhotos.length}`,l:"Photos"}].map(({v,l}) => (
                        <div key={l}><div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:"#FFFFFF" }}>{v}</div><div style={{ fontFamily:"'Inter',sans-serif",fontSize:9,color:"#6A6A5A",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2 }}>{l}</div></div>
                      ))}
                    </div>
                    <div style={{ height:1,background:"#222",margin:"14px 0" }}/>
                    <div style={{ fontFamily:"'Inter',sans-serif",fontSize:12,color:"#6A6A5A" }}>{currentUser.name} · {todayStr()}</div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                    <button onClick={() => session && exportPDF(session)} style={{ padding:"12px",background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,color:"#F0EEE8",fontFamily:"'Inter',sans-serif",fontSize:12,cursor:"pointer",letterSpacing:"0.08em" }}>Export PDF</button>
                    <button onClick={() => session && emailReport(session)} style={{ padding:"12px",background:"#161616",border:"1px solid #2A2A2A",borderRadius:8,color:"#F0EEE8",fontFamily:"'Inter',sans-serif",fontSize:12,cursor:"pointer",letterSpacing:"0.08em" }}>Email Report</button>
                  </div>
                  {signature && (
                    <div style={{ background:"#161616",border:"1px solid #2A2A2A",borderRadius:10,padding:16,marginBottom:14 }}>
                      <div style={S.lbl}>Field manager signature</div>
                      <img src={signature} style={{ maxWidth:"100%",borderRadius:4 }}/>
                    </div>
                  )}
                  <button onClick={resetSession} style={S.btn}>Begin Another Clean</button>
                  <p style={{ textAlign:"center",fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:14,color:"#4A4A3A",marginTop:16 }}>
                    "{scripture.text}" — {scripture.ref}
                  </p>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {showSigPad && <SignaturePad onSave={(sig) => { setSignature(sig); setShowSigPad(false); }} onCancel={() => setShowSigPad(false)}/>}
    </div>
  );
}
