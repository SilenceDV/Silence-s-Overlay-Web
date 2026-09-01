import type {EditorApi} from "@/hooks/useEditorState";
import type {EditorSettings,Layer} from "@/types/editor";

export function EditorToolbar({api,layer,settings,onAddImage,onOverlayOnly}:{api:EditorApi;layer:Layer|null;settings:EditorSettings;onAddImage:()=>void;onOverlayOnly:()=>void}){
 const view=(patch:Partial<EditorSettings>)=>api.updateProject({settings:{...settings,...patch}});
 return <header id="topToolbar">
  <div className="toolGroup"><span className="toolbarLabel">Add</span><button className="icon" title="Add Text" onClick={api.addText}>T<span className="plus">+</span></button><button className="icon" title="Add Image" onClick={onAddImage}>🖼<span className="plus">+</span></button></div>
  <div className="toolGroup"><span className="toolbarLabel">Layer</span><button className="icon" title="Bring Forward" onClick={()=>layer&&api.moveLayer(layer.id,1)}>⬆</button><button className="icon" title="Send Backward" onClick={()=>layer&&api.moveLayer(layer.id,-1)}>⬇</button><button className="icon" title="Duplicate Layer" onClick={()=>layer&&api.duplicateLayer(layer.id)}>⧉</button><button className="icon" title="Lock Layer" onClick={()=>layer&&api.updateLayer(layer.id,{locked:!layer.locked})}>🔒</button><button className="icon danger" title="Delete Layer" onClick={()=>layer&&api.deleteLayer(layer.id)}>🗑</button></div>
  <div className="toolGroup"><span className="toolbarLabel">Align</span><button className="icon" title="Center X" onClick={()=>layer&&api.updateLayer(layer.id,{x:50})}>↔</button><button className="icon" title="Center Y" onClick={()=>layer&&api.updateLayer(layer.id,{y:50})}>↕</button></div>
  <div className="toolGroup"><span className="toolbarLabel">Edit</span><button className="icon dark" title="Undo" onClick={api.undo}>↶</button><button className="icon dark" title="Redo" onClick={api.redo}>↷</button></div>
  <div className="toolGroup"><span className="toolbarLabel">View</span><button className={`icon dark ${settings.showCenter?"active":""}`} title="Center Guides" onClick={()=>view({showCenter:!settings.showCenter})}>＋</button><button className={`icon dark ${settings.showSafe?"active":""}`} title="Safe Area" onClick={()=>view({showSafe:!settings.showSafe})}>▣</button><button className="icon dark" title="Overlay Only" onClick={onOverlayOnly}>👁</button></div>
 </header>;
}

