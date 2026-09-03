"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./qr-scanner.module.css";

function destinationFromScan(raw:string){
  const value=raw.trim();
  if(/^[A-Z0-9]{6,20}$/i.test(value)) return `/p/${value.toUpperCase()}`;
  try{const url=new URL(value);const match=url.pathname.match(/^\/p\/([A-Z0-9]{6,20})\/?$/i);if(match)return `/p/${match[1].toUpperCase()}`;}catch{}
  return null;
}

export function QrScanner(){
  const videoRef=useRef<HTMLVideoElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const [status,setStatus]=useState("Kamera noch nicht gestartet.");
  const [manual,setManual]=useState("");
  const [running,setRunning]=useState(false);
  useEffect(()=>()=>{streamRef.current?.getTracks().forEach(track=>track.stop());},[]);

  async function start(){
    setStatus("Kamera wird gestartet …");
    const Detector=(globalThis as typeof globalThis & {BarcodeDetector?:new(options:{formats:string[]})=>{detect:(source:CanvasImageSource)=>Promise<Array<{rawValue:string}>>}}).BarcodeDetector;
    if(!Detector){setStatus("Dieser Browser unterstützt den direkten QR-Scanner nicht. Nutze die Kamera-App deines Smartphones oder gib die Pass-ID unten ein.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      streamRef.current=stream;
      const video=videoRef.current;if(!video)return;video.srcObject=stream;await video.play();setRunning(true);setStatus("QR-Code vor die Kamera halten.");
      const detector=new Detector({formats:["qr_code"]});
      const tick=async()=>{if(!streamRef.current||!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);const destination=codes[0]?.rawValue?destinationFromScan(codes[0].rawValue):null;if(destination){streamRef.current.getTracks().forEach(track=>track.stop());streamRef.current=null;window.location.assign(destination);return;}}catch{}requestAnimationFrame(tick);};
      requestAnimationFrame(tick);
    }catch{setStatus("Kamera konnte nicht geöffnet werden. Bitte Kameraberechtigung prüfen oder die Pass-ID manuell eingeben.");}
  }

  function submit(event:FormEvent){event.preventDefault();const destination=destinationFromScan(manual);if(destination)window.location.assign(destination);else setStatus("Keine gültige NavoPass-ID oder kein gültiger NavoPass-QR-Link.");}

  return <div className={styles.shell}>
    <div className={styles.camera}><video ref={videoRef} muted playsInline aria-label="QR Scanner Kamera"/><div className={styles.frame} aria-hidden="true"/></div>
    <p className={styles.status} role="status">{status}</p>
    <div className={styles.actions}>{!running&&<button className="button" type="button" onClick={start}>Kamera starten</button>}<a className="button ghost" href="/app/assets/new">Neuen Pass anlegen</a></div>
    <form className={styles.manual} onSubmit={submit}><label>Pass-ID oder NavoPass-Link<input value={manual} onChange={event=>setManual(event.target.value)} placeholder="z. B. ABC123XYZ oder https://navopass.de/p/…"/></label><button className="button small" type="submit">Pass öffnen</button></form>
    <p className={`muted ${styles.hint}`}>Alternativ kannst du die normale Kamera-App auf iPhone oder Android verwenden. Ein NavoPass-QR-Code öffnet den Objektpass direkt im Browser.</p>
  </div>;
}
