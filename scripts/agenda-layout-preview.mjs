// Fixture local com componentes reais e dados sintéticos. Sem banco ou autenticação.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = `
import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AdminAgendaPanel} from './src/components/ava/admin-agenda-panel';
const version='2026-09-14T10:00:00.000Z';
const students=Array.from({length:8},(_,i)=>({id:'student-'+i,name:['Aluno com nome completo muito comprido para testar a visualização','Beatriz de Teste','Carlos de Teste','Daniel de Teste','Eduarda de Teste','Fernanda de Teste','Gabriel de Teste','Helena de Teste'][i],unit:i<5?'IVATE':'DOURADINA',isActive:true,defaultTime:'08:00',weekdayMask:2,notes:i===0?'Observação completa que precisa continuar legível sem cortar nenhuma informação importante.':null,phone:i%2===0?'(44) 99999-0000':null,updatedAt:version}));
const lessons=students.flatMap((s,i)=>[14,21].map(day=>({id:s.id+'-'+day,date:'2026-09-'+day+'T12:00:00Z',isActive:true,isMakeup:false,makeupForLessonId:null,month:9,notes:null,status:i===7?'ATTENDED':'SCHEDULED',studentId:s.id,studentName:s.name,studentNotes:s.notes,studentPhone:s.phone,studentUnit:s.unit,time:(8+i).toString().padStart(2,'0')+':00',weekday:1,year:2026,updatedAt:version})));
function Preview(){const [rows,setRows]=useState(lessons);const [people,setPeople]=useState(students);const [unit,setUnit]=useState('all');
useEffect(()=>{const time=e=>{const v=e.detail;setRows(prev=>prev.map(l=>(v.scope==='LESSON'?l.id===v.lessonId:l.studentId===v.studentId&&l.status==='SCHEDULED')?{...l,time:v.time}:l));if(v.scope==='ROUTINE')setPeople(prev=>prev.map(s=>s.id===v.studentId?{...s,defaultTime:v.time}:s));};const status=e=>setRows(prev=>prev.map(l=>l.id===e.detail.lessonId?{...l,status:e.detail.status}:l));const navigation=e=>setUnit(e.detail.includes('unit=IVATE')?'IVATE':e.detail.includes('unit=DOURADINA')?'DOURADINA':'all');window.addEventListener('fixture-time',time);window.addEventListener('fixture-status',status);window.addEventListener('fixture-navigate',navigation);return()=>{window.removeEventListener('fixture-time',time);window.removeEventListener('fixture-status',status);window.removeEventListener('fixture-navigate',navigation);}},[]);
return <div className="grid min-h-screen xl:grid-cols-[360px_minmax(0,1fr)]"><aside className="hidden border-r bg-primary/5 p-6 xl:block">Candy English · teste isolado</aside><main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8"><AdminAgendaPanel initialMonth={9} initialUnitFilter={unit} nowIso="2026-09-14T11:00:00Z" avaStudents={[]} logs={[]} students={people.filter(s=>unit==='all'||s.unit===unit)} lessons={rows.filter(s=>unit==='all'||s.studentUnit===unit)}/></main></div>}
createRoot(document.getElementById('root')).render(<Preview/>);
`;
const stubs = {
  "next/navigation": `export const useRouter=()=>({refresh(){},push(url){window.dispatchEvent(new CustomEvent('fixture-navigate',{detail:url}));}});`,
  "@/app/ava/admin/agenda-time-actions": `export async function updateAgendaTime(data){await new Promise(r=>setTimeout(r,300));if(data.time==='09:59')return {ok:false,message:'Conflito de teste: atualize a agenda.'};window.dispatchEvent(new CustomEvent('fixture-time',{detail:data}));return {ok:true,message:'Horário salvo na fixture.'};}`,
  "@/app/ava/admin/actions": `export async function updateAgendaAttendance(data){window.dispatchEvent(new CustomEvent('fixture-status',{detail:data}));return {ok:true,message:'Salvo'};}export async function createAgendaSchedule(){return {ok:false,message:'Cadastro desabilitado na fixture'};}export const updateAgendaStudentSchedule=createAgendaSchedule;export const deleteAgendaStudent=createAgendaSchedule;`,
};
let assets;
async function build() {
  const js = await esbuild.build({
    stdin: { contents: fixture, loader: "tsx", resolveDir: root },
    bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"), define: { "process.env.NODE_ENV": '"development"' },
    plugins: [{ name: "fixture-boundaries", setup(build) {
      build.onResolve({ filter: /^(next\/navigation|@\/app\/ava\/admin\/(actions|agenda-time-actions))$/ }, args => ({ path: args.path, namespace: "fixture" }));
      build.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: stubs[args.path], loader: "js" }));
    } }],
  });
  const cssPath = path.join(root, "src/app/globals.css");
  const css = await postcss([tailwind({ base: root })]).process(fs.readFileSync(cssPath, "utf8"), { from: cssPath });
  return { js: js.outputFiles[0].text, css: css.css };
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/favicon.ico") { res.writeHead(204); return res.end(); }
    if (req.url === "/") assets = await build();
    if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(assets.js); }
    if (req.url === "/fixture.css") { res.setHeader("Content-Type", "text/css"); return res.end(assets.css); }
    if (req.url !== "/") { res.writeHead(404); return res.end(); }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end('<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><title>Agenda · teste isolado</title></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  } catch (error) { console.error(error.message); res.writeHead(500); res.end("Fixture indisponível"); }
});
server.listen(3114, "127.0.0.1", () => console.log("Fixture isolada: http://127.0.0.1:3114"));
