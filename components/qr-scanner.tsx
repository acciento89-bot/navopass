"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./qr-scanner.module.css";
import type { Locale } from "@/lib/i18n";

function destinationFromScan(raw:string){
  const value=raw.trim();
  if(/^[A-Z0-9]{6,20}$/i.test(value)) return `/p/${value.toUpperCase()}`;
  try{const url=new URL(value);const match=url.pathname.match(/^\/p\/([A-Z0-9]{6,20})\/?$/i);if(match)return `/p/${match[1].toUpperCase()}`;}catch{}
  return null;
}

export function QrScanner({locale="de"}:{locale?:Locale}){
  const en=locale==="en";
  const videoRef=useRef<HTMLVideoElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const [status,setStatus]=useState(en?"Camera not started yet.":"Kamera noch nicht gestartet.");
  const [manual,setManual]=useState("");
  const [running,setRunning]=useState(false);
  useEffect(()=>()=>{streamRef.current?.getTracks().forEach(track=>track.stop());},[]);

  async function start(){
    setStatus(en?"Starting camera …":"Kamera wird gestartet …");
    const Detector=(globalThis as typeof globalThis & {BarcodeDetector?:new(options:{formats:string[]})=>{detect:(source:CanvasImageSource)=>Promise<Array<{rawValue:string}>>}}).BarcodeDetector;
    if(!Detector){setStatus(en?"This browser does not support direct QR scanning. Use your phone’s camera app or enter the pass ID below.":"Dieser Browser unterstützt den direkten QR-Scanner nicht. Nutze die Kamera-App deines Smartphones oder gib die Pass-ID unten ein.");return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      streamRef.current=stream;
      const video=videoRef.current;if(!video)return;video.srcObject=stream;await video.play();setRunning(true);setStatus(en?"Hold the QR code in front of the camera.":"QR-Code vor die Kamera halten.");
      const detector=new Detector({formats:["qr_code"]});
      const tick=async()=>{if(!streamRef.current||!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);const destination=codes[0]?.rawValue?destinationFromScan(codes[0].rawValue):null;if(destination){streamRef.current.getTracks().forEach(track=>track.stop());streamRef.current=null;window.location.assign(destination);return;}}catch{}requestAnimationFrame(tick);};
      requestAnimationFrame(tick);
    }catch{setStatus(en?"The camera could not be opened. Check camera permission or enter the pass ID manually.":"Kamera konnte nicht geöffnet werden. Bitte Kameraberechtigung prüfen oder die Pass-ID manuell eingeben.");}
  }

  function submit(event:FormEvent){event.preventDefault();const destination=destinationFromScan(manual);if(destination)window.location.assign(destination);else setStatus(en?"Not a valid NavoPass ID or QR link.":"Keine gültige NavoPass-ID oder kein gültiger NavoPass-QR-Link.");}

  return <div className={styles.shell}>
    <div className={styles.camera}><video ref={videoRef} muted playsInline aria-label={en?"QR scanner camera":"QR Scanner Kamera"}/><div className={styles.frame} aria-hidden="true"/></div>
    <p className={styles.status} role="status">{status}</p>
    <div className={styles.actions}>{!running&&<button className="button" type="button" onClick={start}>{en?"Start camera":"Kamera starten"}</button>}<a className="button ghost" href="/app/assets/new">{en?"Create new pass":"Neuen Pass anlegen"}</a></div>
    <form className={styles.manual} onSubmit={submit}><label>{en?"Pass ID or NavoPass link":"Pass-ID oder NavoPass-Link"}<input value={manual} onChange={event=>setManual(event.target.value)} placeholder={en?"e.g. ABC123XYZ or https://navopass.de/p/…":"z. B. ABC123XYZ oder https://navopass.de/p/…"}/></label><button className="button small" type="submit">{en?"Open pass":"Pass öffnen"}</button></form>
    <p className={`muted ${styles.hint}`}>{en?"Alternatively, use the regular camera app on iPhone or Android. A NavoPass QR code opens the asset pass directly in the browser.":"Alternativ kannst du die normale Kamera-App auf iPhone oder Android verwenden. Ein NavoPass-QR-Code öffnet den Objektpass direkt im Browser."}</p>
  </div>;
}
