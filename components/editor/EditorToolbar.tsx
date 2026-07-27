import type { EditorApi } from "@/hooks/useEditorState";
import type { Layer } from "@/types/editor";

interface Props {
  api: EditorApi;
  layer: Layer | null;
  canUndo: boolean;
  canRedo: boolean;
  onAddImage: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onSave: () => void;
}

export function EditorToolbar({ api, layer, canUndo, canRedo, onAddImage, onExport, onImport, onReset, onSave }: Props) {
  return <header className="editor-toolbar">
    <div><button title="Add text layer" onClick={api.addText}>T+ Text</button><button title="Add image layer" onClick={onAddImage}>+ Image</button></div>
    <div className="layer-actions"><button disabled={!layer} onClick={() => layer && api.moveLayer(layer.id, 1)}>Forward</button><button disabled={!layer} onClick={() => layer && api.moveLayer(layer.id, -1)}>Backward</button><button disabled={!layer} onClick={() => layer && api.duplicateLayer(layer.id)}>Duplicate</button><button disabled={!layer} onClick={() => layer && api.updateLayer(layer.id, { locked: !layer.locked })}>{layer?.locked ? "Unlock" : "Lock"}</button><button className="danger" disabled={!layer} onClick={() => layer && api.deleteLayer(layer.id)}>Delete</button></div>
    <div><button disabled={!canUndo} onClick={api.undo}>Undo</button><button disabled={!canRedo} onClick={api.redo}>Redo</button></div>
    <div className="project-actions"><button onClick={onSave}>Save now</button><button onClick={onImport}>Import</button><button onClick={onExport}>Export</button><button className="danger" onClick={onReset}>New</button></div>
  </header>;
}
