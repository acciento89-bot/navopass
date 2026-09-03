"use client";

import { useEffect, useRef, useState } from "react";

export function CustomerSignaturePad({ defaultCustomerName }: { defaultCustomerName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.clientWidth;
      const height = 150;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#18374b";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function position(event: React.PointerEvent<HTMLCanvasElement>) { const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function start(event: React.PointerEvent<HTMLCanvasElement>) { const ctx = event.currentTarget.getContext("2d"); if (!ctx) return; event.currentTarget.setPointerCapture(event.pointerId); const p=position(event); ctx.beginPath(); ctx.moveTo(p.x,p.y); }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const ctx=event.currentTarget.getContext("2d"); if(!ctx)return; const p=position(event); ctx.lineTo(p.x,p.y); ctx.stroke(); setHasSignature(true); }
  function end(event: React.PointerEvent<HTMLCanvasElement>) { if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId); syncSignature(event); }
  function clear() { const canvas=canvasRef.current; if(!canvas)return; const ctx=canvas.getContext("2d"); if(!ctx)return; ctx.clearRect(0,0,canvas.width,canvas.height); setHasSignature(false); const hidden=canvas.parentElement?.querySelector<HTMLInputElement>('input[name="customerSignature"]'); if(hidden)hidden.value=""; }
  function syncSignature(event: React.SyntheticEvent<HTMLCanvasElement>) { const canvas=canvasRef.current; if(!canvas)return; const hidden=event.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[name="customerSignature"]'); if(hidden)hidden.value=hasSignature||event.type==="pointerup"?canvas.toDataURL("image/png"):""; }

  return <div className="compact-form" style={{ marginTop: 0 }}>
    <label>Kundenname für Bestätigung<input name="customerName" maxLength={180} defaultValue={defaultCustomerName||""} placeholder="optional" /></label>
    <div><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:7 }}><span style={{ color:"#61798b",fontSize:".78rem",fontWeight:800 }}>Kundenunterschrift</span><button className="button ghost small" type="button" onClick={clear}>Löschen</button></div>
      <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} style={{ width:"100%",touchAction:"none",border:"1px solid #dce8ef",borderRadius:14,background:"#fff" }} aria-label="Feld für Kundenunterschrift" />
      <input type="hidden" name="customerSignature"/><small className="muted">Optional. Die Unterschrift wird ausschließlich diesem Serviceeintrag zugeordnet.</small>
    </div>
  </div>;
}
