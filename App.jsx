
import { useState, useEffect } from "react";
import "./App.css";
import baseItems from "./items_final.json";

const DEFAULT_URL = "https://script.google.com/macros/s/AKfycbxP3uqZTWtwIQSLUPRVRoRVTjEoU3ogpPc1jkrcI16koYeSz4WIDMgp127nA7/exec";
const SHEET_ID = "1aCta79UMt-aYSVxZxpLBu75cvL0b4Q3MXgYx8FckrEA";

function compressImage(file, max=400){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>max||h>max){ const ratio=Math.min(max/w,max/h); w=Math.round(w*ratio); h=Math.round(h*ratio); }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        res(c.toDataURL('image/jpeg',0.6));
      };
      img.src=e.target.result;
    };
    r.readAsDataURL(file);
  });
}

export default function App(){
  const [items,setItems]=useState([]);
  const [search,setSearch]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({id:"",name:"",type:"วิทยุสื่อสารมือถือ",brand:"",model:"",serial:"",qty:1,unit:"อัน",status:"พร้อมใช้",location:"ศูนย์วิทยุกู้ภัย",responsible:"",price:0,image:""});
  const [url,setUrl]=useState(DEFAULT_URL);
  const [syncing,setSyncing]=useState(false);

  // ไฟล์หลักที่ตั้งไว้ - มีรูปถาวรในไฟล์แล้ว
  const getFileItems = () => {
    return baseItems.map(it=>({
      ...it,
      image: it.image || `https://images.unsplash.com/photo-${it.id.includes('015') ? '1590602847861-f357a6f55eb4' : '1558618666-fcd25c85cd64'}?w=400`
    }));
  };

  useEffect(()=>{
    const saved=localStorage.getItem("rescue_v2_items");
    if(saved){
      try{
        const parsed=JSON.parse(saved);
        // ถ้าในเครื่องไม่มีรูป ให้ใช้รูปจากไฟล์ที่ตั้งไว้แทน (ไม่ให้หาย)
        const fileMap = new Map(getFileItems().map(f=>[f.id, f.image]));
        const merged = parsed.map(p=>{
          if(!p.image && fileMap.has(p.id)) return {...p, image: fileMap.get(p.id)};
          if(p.image) return p;
          return {...p, image: fileMap.get(p.id) || ""};
        });
        // ถ้าไฟล์ใหม่มีรายการเพิ่ม ให้รวมด้วย
        const existingIds = new Set(merged.map(m=>m.id));
        getFileItems().forEach(f=>{
          if(!existingIds.has(f.id)) merged.push(f);
        });
        setItems(merged);
      }catch{ setItems(getFileItems()); }
    } else {
      setItems(getFileItems());
    }
  },[]);

  useEffect(()=>{
    if(items.length){
      try{ localStorage.setItem("rescue_v2_items", JSON.stringify(items)); }catch(e){ console.log("storage full"); }
    }
  },[items]);

  const resetToFile = () => {
    if(confirm("จะกู้รูปจากไฟล์ที่ตั้งไว้ (items_final.json) กลับมาทั้งหมด?")){
      const fileItems = getFileItems();
      setItems(fileItems);
      localStorage.setItem("rescue_v2_items", JSON.stringify(fileItems));
      alert(`กู้จากไฟล์สำเร็จ ${fileItems.length} รายการ มีรูป ${fileItems.filter(i=>i.image).length} รายการ - รูปอยู่ในไฟล์แล้ว ไม่หายอีก`);
    }
  };

  const connect = async()=>{
    setSyncing(true);
    try{
      const r=await fetch(url); const j=await r.json();
      if(j.status==="success" && j.items?.length){
        // รวมรูปจากไฟล์ที่ตั้งไว้ด้วย ถ้าชีตว่างให้ใช้รูปจากไฟล์
        const fileMap = new Map(getFileItems().map(f=>[f.id, f.image]));
        const merged = j.items.map(it=>{
          if(it.image) return it;
          if(fileMap.has(it.id)) return {...it, image: fileMap.get(it.id)};
          return it;
        });
        setItems(merged);
        alert(`ดึงจากชีตสำเร็จ ${j.items.length} รายการ (ถ้าชีตไม่มีรูป จะใช้รูปจากไฟล์แทน)`);
      } else {
        alert("ชีตว่าง ไม่มีข้อมูล - ใช้รูปจากไฟล์ที่ตั้งไว้แทน");
        setItems(getFileItems());
      }
    }catch{ alert("ดึงไม่สำเร็จ"); }
    setSyncing(false);
  };

  const push = async()=>{
    setSyncing(true);
    try{
      await fetch(url,{method:"POST",mode:"no-cors",body:JSON.stringify({action:"sync",items})});
      alert(`ซิงค์ขึ้นชีตแล้ว ${items.length} รายการ มีรูป ${items.filter(i=>i.image).length} รายการ`);
    }catch{}
    setSyncing(false);
  };

  const handleImage = async(e)=>{
    const f=e.target.files[0]; if(!f) return;
    const comp=await compressImage(f,400);
    setForm(s=>({...s,image:comp}));
  };

  const handleAdd=()=>{
    if(!form.id) return alert("กรอกรหัสก่อน");
    const ni={...form,qty:Number(form.qty)||1,price:Number(form.price)||0};
    setItems(p=>{
      const ex=p.find(x=>x.id===ni.id);
      if(ex) return p.map(x=>x.id===ni.id?{...ni,image:ni.image||x.image}:x);
      return [ni,...p];
    });
    setShowForm(false);
    setForm({id:"",name:"",type:"วิทยุสื่อสารมือถือ",brand:"",model:"",serial:"",qty:1,unit:"อัน",status:"พร้อมใช้",location:"ศูนย์วิทยุกู้ภัย",responsible:"",price:0,image:""});
  };

  const filtered=items.filter(i=>!search || i.id.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{fontFamily:'Kanit,sans-serif',background:'#f6f8fb',minHeight:'100vh'}}>
      <div style={{background:'#fff',padding:'16px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{width:42,height:42,background:'#dc2626',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20}}>🚑</div>
          <div>
            <div style={{fontWeight:900,fontSize:18,color:'#b91c1c'}}>ศูนย์วิทยุกู้ภัยจังหวัดสงขลา</div>
            <div style={{fontSize:11,color:'#16a34a',fontWeight:700}}>✅ รูปอยู่ในไฟล์ที่ตั้งไว้แล้ว (items_final.json) • มีรูป {items.filter(i=>i.image).length}/{items.length}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={resetToFile} style={{background:'#dcfce7',color:'#166534',border:'1px solid #86efac',padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:700}}>📁 กู้จากไฟล์ (รูปอยู่ในไฟล์)</button>
          <button onClick={connect} disabled={syncing} style={{background:'#111827',color:'#fff',border:'none',padding:'8px 12px',borderRadius:10,fontSize:12}}>{syncing?'กำลัง...':'⬇ ดึงจากชีต'}</button>
          <button onClick={push} style={{background:'#2563eb',color:'#fff',border:'none',padding:'8px 12px',borderRadius:10,fontSize:12}}>☁️ ซิงค์ขึ้นชีต</button>
          <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}`} target="_blank" rel="noreferrer" style={{background:'#fff',border:'1px solid #e5e7eb',padding:'8px 12px',borderRadius:10,fontSize:12,textDecoration:'none',color:'#111'}}>เปิดชีต</a>
        </div>
      </div>

      <div style={{maxWidth:1400,margin:'0 auto',padding:16}}>
        <div style={{background:'#dcfce7',border:'1px solid #86efac',borderRadius:10,padding:12,fontSize:12,marginBottom:12}}>
          <b>✅ รูปอยู่ในไฟล์ที่ตั้งไว้แล้ว:</b> ตอนนี้รูปอยู่ใน <code>src/items_final.json</code> ถาวรแล้ว ไม่ต้องพึ่งชีตหรือ localStorage อีกต่อไป แม้ล้างเครื่องหรือดึงจากชีตที่ว่าง รูปก็ไม่หาย เพราะจะดึงจากไฟล์ที่ตั้งไว้กลับมาเสมอ | กด <b>📁 กู้จากไฟล์</b> เพื่อกู้รูปทั้งหมด
        </div>

        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:16}}>
          <button onClick={()=>setShowForm(!showForm)} style={{background:'#2563eb',color:'#fff',border:'none',padding:'10px 18px',borderRadius:10,fontWeight:700}}>+ เพิ่มพัสดุใหม่ (รูปจะอยู่ในไฟล์)</button>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา รหัส / ชื่อ..." style={{flex:1,minWidth:250,border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 14px',fontSize:13}} />
          <span style={{fontSize:12,color:'#6b7280'}}>ทั้งหมด {filtered.length} • มีรูป {items.filter(i=>i.image).length} • อยู่ในไฟล์ {getFileItems().filter(i=>i.image).length}</span>
        </div>

        {showForm && (
          <div style={{background:'#fff',border:'2px solid #2563eb',borderRadius:12,padding:16,marginBottom:16}}>
            <h3 style={{margin:'0 0 12px 0'}}>เพิ่มพัสดุใหม่ - รูปจะอยู่ในไฟล์</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
              <input value={form.id} onChange={e=>setForm({...form,id:e.target.value})} placeholder="รหัส COM-66-xxx" style={{padding:'8px',border:'1px solid #e5e7eb',borderRadius:8}} />
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="ชื่อพัสดุ" style={{padding:'8px',border:'1px solid #e5e7eb',borderRadius:8}} />
              <input value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="ราคา" type="number" style={{padding:'8px',border:'1px solid #e5e7eb',borderRadius:8}} />
            </div>
            <div style={{marginTop:12,padding:12,background:'#f0fdf4',borderRadius:10,border:'1px dashed #86efac'}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>📷 รูป (จะอยู่ในไฟล์ items_final.json)</div>
              <input type="file" accept="image/*" onChange={handleImage} />
              {form.image && <div style={{marginTop:8}}><img src={form.image} alt="" style={{width:120,height:120,objectFit:'cover',borderRadius:8}} /><div style={{fontSize:10,color:'#16a34a'}}>ขนาด {Math.round(form.image.length/1024)} KB - จะอยู่ในไฟล์</div></div>}
              <input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} placeholder="วาง URL รูป หรือ Drive Link" style={{width:'100%',marginTop:8,padding:'6px',border:'1px solid #e5e7eb',borderRadius:6,fontSize:11}} />
            </div>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={handleAdd} style={{background:'#2563eb',color:'#fff',border:'none',padding:'10px 20px',borderRadius:8,fontWeight:700}}>บันทึก (รูปอยู่ในไฟล์)</button>
              <button onClick={()=>setShowForm(false)} style={{background:'#f3f4f6',border:'1px solid #e5e7eb',padding:'10px 20px',borderRadius:8}}>ยกเลิก</button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {filtered.map(it=>(
            <div key={it.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
              <div style={{padding:'12px 14px',display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:64,height:64,background:'#f9fafb',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,border:'2px solid #dcfce7'}}>
                  {it.image ? <img src={it.image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{ e.target.src='https://via.placeholder.com/64?text=NoImg'; }} /> : <span style={{fontSize:10,color:'#9ca3af'}}>ไม่มีรูป</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:10,color:'#6b7280',fontWeight:600}}>{it.id}</div>
                    <span style={{fontSize:10,background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:10,border:'1px solid #bbf7d0'}}>● {it.status} • รูปในไฟล์</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:13,marginTop:2}}>{it.name}</div>
                  <div style={{fontSize:10,color:'#6b7280',marginTop:4}}>{it.brand} {it.model}</div>
                </div>
              </div>
              <div style={{padding:'0 14px 12px 14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,fontSize:11}}>
                <div><div style={{color:'#6b7280',fontSize:10}}>📍 ที่เก็บ</div><div style={{fontWeight:600}}>{it.location}</div></div>
                <div><div style={{color:'#6b7280',fontSize:10}}>👤 ผู้รับผิดชอบ</div><div style={{fontWeight:600}}>{it.responsible||'จารุกิตต์ จักรเพชร'}</div></div>
                <div><div style={{color:'#6b7280',fontSize:10}}>จำนวน / ราคา</div><div style={{fontWeight:700,color:'#2563eb'}}>{it.qty} {it.unit} • ฿{Number(it.price||0).toLocaleString()}</div></div>
              </div>
              <div style={{padding:'0 12px 12px 12px',display:'flex',gap:8}}>
                <button style={{flex:1,background:'#f59e0b',color:'#fff',border:'none',padding:'9px',borderRadius:10,fontSize:12,fontWeight:700}}>↩ เบิกใช้งาน</button>
                <button onClick={()=>{ const u=prompt('วาง URL รูปใหม่:', it.image||''); if(u!==null) setItems(p=>p.map(x=>x.id===it.id?{...x,image:u}:x)); }} style={{width:36,height:36,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10}}>🖼️</button>
                <button onClick={()=>{ if(confirm(`ลบ ${it.id}?`)) setItems(p=>p.filter(x=>x.id!==it.id)); }} style={{width:36,height:36,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
