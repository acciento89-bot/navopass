"use client";

import { useEffect, useRef, useState } from "react";

export function CustomerSignaturePad() {
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

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setPointerCapture(event.pointerId);
    const point = position(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const point = position(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function syncSignature(event: React.FormEvent<HTMLDivElement>) {
    const root = event.currentTarget;
    const hidden = root.querySelector<HTMLInputElement>('input[name="customerSignature"]');
    const canvas = canvasRef.current;
    if (hidden && canvas) hidden.value = hasSignature ? canvas.toDataURL("image/png") : "";
  }

  return <div className="compact-form" style={{ marginTop: 0 }} onPointerUp={syncSignature} onPointerCancel={syncSignature}>
    <label>Kundenname für Bestätigung<input name="customerName" maxLength={180} placeholder="optional" /></label>
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 7 }}>
        <span style={{ color: "#61798b", fontSize: ".78rem", fontWeight: 800 }}>Kundenunterschrift</span>
        <button className="button ghost small" type="button" onClick={clear}>Löschen</button>
      </div>
      <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} style={{ width: "100%", touchAction: "none", border: "1px solid #dce8ef", borderRadius: 14, background: "#fff" }} aria-label="Feld für Kundenunterschrift" />
      <input type="hidden" name="customerSignature" />
      <small className="muted">Optional. Die Unterschrift wird ausschließlich diesem Serviceeintrag zugeordnet.</small>
    </div>
  </div>;
}
