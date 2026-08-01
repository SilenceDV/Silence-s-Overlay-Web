"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import { useEditorState } from "@/hooks/useEditorState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { deserializeProject, serializeProject } from "@/lib/editor/serialization";
import { MAX_RAW_IMAGE_BYTES } from "@/lib/validation/projectSchemas";
import { CanvasStage } from "./CanvasStage";
import { EditorSidebar } from "./EditorSidebar";
import { EditorToolbar } from "./EditorToolbar";

const MAX_PROJECT_BYTES = 8_000_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function OverlayEditor({initialProject,projectId,version,proAccess}:{initialProject: import("@/types/editor").Project;projectId:string;version:number;proAccess:boolean}) {
  const { state, slide, layer, api } = useEditorState();
  const imageInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const replace = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [upgrade,setUpgrade]=useState(false);
  const [overlayOnly,setOverlayOnly]=useState(false);
  const rotation=useRef<number|null>(null);
  const markSaving = useCallback(() => api.markSaving(), [api]);
  const markSaved = useCallback(() => api.markSaved(), [api]);
  const markSaveError = useCallback(() => api.markSaveError(), [api]);
  const showSaveError = useCallback((message?: string) => {
    markSaveError();
    setNotice(message ?? "Save failed.");
  }, [markSaveError]);

  useKeyboardShortcuts(api, state.selectedLayerId);
  const saveCoordinator=useAutosave(state.project, state.saveStatus === "dirty", projectId, version, markSaving, markSaved, showSaveError);

  useEffect(() => { api.replaceProject(initialProject); /* initial database hydration only */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProject]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(state.saveStatus==="dirty"||state.saveStatus==="saving"){e.preventDefault();e.returnValue=""}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[state.saveStatus]);
  const limitedApi={...api,addSlide:()=>proAccess?api.addSlide():setUpgrade(true),duplicateSlide:(id:string)=>proAccess?api.duplicateSlide(id):setUpgrade(true)};

  const pickImage = (isReplace = false) => {
    replace.current = isReplace;
    imageInput.current?.click();
  };

  const readImage = (file?: File) => {
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) {
      setNotice("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_RAW_IMAGE_BYTES) {
      setNotice("Images must be smaller than 6 MB so the encoded project can be saved.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setNotice("The image could not be read.");
    reader.onload = () => {
      const url = String(reader.result);
      if (replace.current && layer?.type === "image") api.updateLayer(layer.id, { imageUrl: url, fileName: file.name, name: file.name });
      else api.addImage(url, file.name);
      setNotice(null);
    };
    reader.readAsDataURL(file);
  };

  const saveNow=async()=>{ await saveCoordinator.saveNow(state.project); setNotice("Project saved."); };

  const exportProject = () => {
    const blob = new Blob([serializeProject(state.project)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.project.name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "overlay"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const importProject = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_PROJECT_BYTES) {
      setNotice("Project files must be smaller than 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setNotice("The project file could not be read.");
    reader.onload = () => {
      try {
        const imported=deserializeProject(String(reader.result)); if(!proAccess&&imported.slides.length>1){setUpgrade(true);return;} imported.id=projectId; api.replaceProject(imported, true);
        setNotice("Project imported successfully.");
      } catch {
        setNotice("That file is not a valid overlay project.");
      }
    };
    reader.readAsText(file);
  };

  const resetProject = () => {
    if (window.confirm("Start a new project? Your current local project will be replaced.")) {
      fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then(async (response) => { const created = await response.json(); if (!response.ok) throw new Error(created.message); location.href = `/editor?id=${created.id}`; }).catch((error) => setNotice(error instanceof Error ? error.message : "Project creation failed."));
    }
  };

  const stopRotation=()=>{if(rotation.current!==null)window.clearInterval(rotation.current);rotation.current=null};
  const startRotation=()=>{stopRotation();api.selectSlide(state.project.slides[0].id);let index=0;rotation.current=window.setInterval(()=>{index=(index+1)%state.project.slides.length;api.selectSlide(state.project.slides[index].id)},Math.max(1,state.project.settings.speed)*1000)};
  const publish=async()=>{try{await saveCoordinator.saveNow(state.project);const response=await fetch("/api/overlays/publish",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId})});const data=await response.json();if(!response.ok)throw new Error(data.message);const url=new URL(data.url,location.origin).toString();await navigator.clipboard.writeText(url);setNotice("Overlay URL copied ✓ Updated version included in link.")}catch(error){setNotice(error instanceof Error?error.message:"Publishing failed.")}};

  return <div className={`editor-shell ${overlayOnly?"overlay-editing":""}`}>
    <EditorSidebar state={state} api={limitedApi} onReplace={() => pickImage(true)} onSave={saveNow} onNew={resetProject} onImport={()=>projectInput.current?.click()} onExport={exportProject} onStart={startRotation} onStop={stopRotation} onPublish={publish}/>
    <section className="editor-workspace">
      <EditorToolbar
        api={limitedApi}
        layer={layer}
        settings={state.project.settings}
        onAddImage={() => pickImage(false)}
        onOverlayOnly={()=>setOverlayOnly(value=>!value)}
      />
      {notice && <div className="editor-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}
      <CanvasStage slide={slide} settings={state.project.settings} selected={state.selectedLayerId} api={api} />
    </section>
    {upgrade&&<div className="modal-backdrop"><section className="card upgrade-modal"><h2>Unlock unlimited slides</h2><p>Free projects support one slide. Pro unlocks unlimited slides, premium animations, and hosted Pro overlays.</p><div className="actions"><a className="button" href="/billing">Upgrade to Pro</a><button onClick={()=>setUpgrade(false)}>Not now</button></div></section></div>}
    <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { readImage(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={projectInput} hidden type="file" accept="application/json,.json" onChange={(event) => { importProject(event.target.files?.[0]); event.target.value = ""; }} />
  </div>;
}
