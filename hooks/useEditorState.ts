"use client";

import { useMemo, useReducer } from "react";
import { defaultImage, defaultProject, defaultSlide, defaultText, createId } from "@/lib/editor/defaults";
import { cloneProject, pushHistory, redoProject, undoProject } from "@/lib/editor/history";
import type { EditorState, Layer, Project, Slide } from "@/types/editor";

export type EditorAction =
  | { type: "select-slide"; id: string }
  | { type: "select-layer"; id: string | null }
  | { type: "mutate"; change: (project: Project) => void; selectSlideId?: string; selectLayerId?: string | null }
  | { type: "mutate-live"; change: (project: Project) => void }
  | { type: "checkpoint" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "save-status"; status: EditorState["saveStatus"] }
  | { type: "replace-project"; project: Project; dirty?: boolean };

const initialState = (project = defaultProject()): EditorState => ({
  project,
  currentSlideId: project.slides[0].id,
  selectedLayerId: project.slides[0].layers[0]?.id ?? null,
  past: [],
  future: [],
  saveStatus: "saved",
});

function withValidSelection(state: EditorState, project: Project): EditorState {
  const slide = project.slides.find((item) => item.id === state.currentSlideId) ?? project.slides[0];
  const selectedExists = slide.layers.some((item) => item.id === state.selectedLayerId);
  return {
    ...state,
    project,
    currentSlideId: slide.id,
    selectedLayerId: selectedExists ? state.selectedLayerId : (slide.layers[0]?.id ?? null),
  };
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "select-slide") {
    const slide = state.project.slides.find((item) => item.id === action.id);
    return slide ? { ...state, currentSlideId: slide.id, selectedLayerId: slide.layers[0]?.id ?? null } : state;
  }
  if (action.type === "select-layer") return { ...state, selectedLayerId: action.id };
  if (action.type === "save-status") return { ...state, saveStatus: action.status };
  if (action.type === "replace-project") {
    const next = initialState(action.project);
    return action.dirty ? { ...next, saveStatus: "dirty" } : next;
  }
  if (action.type === "undo" || action.type === "redo") {
    const hasHistory = action.type === "undo" ? state.past.length > 0 : state.future.length > 0;
    if (!hasHistory) return state;
    const history = action.type === "undo"
      ? undoProject(state.past, state.project, state.future)
      : redoProject(state.past, state.project, state.future);
    return withValidSelection({ ...state, ...history, saveStatus: "dirty" }, history.current);
  }
  if(action.type==="checkpoint")return{...state,past:pushHistory(state.past,state.project),future:[]};
  if(action.type==="mutate-live"){const project=cloneProject(state.project);action.change(project);project.updatedAt=new Date().toISOString();return withValidSelection({...state,project,saveStatus:"dirty"},project)}

  const next = cloneProject(state.project);
  action.change(next);
  next.updatedAt = new Date().toISOString();
  const updated = withValidSelection({
    ...state,
    past: pushHistory(state.past, state.project),
    future: [],
    saveStatus: "dirty",
  }, next);
  if (action.selectSlideId) updated.currentSlideId = action.selectSlideId;
  if (action.selectLayerId !== undefined) updated.selectedLayerId = action.selectLayerId;
  return updated;
}

export function useEditorState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const slide = state.project.slides.find((item) => item.id === state.currentSlideId) ?? state.project.slides[0];
  const layer = slide?.layers.find((item) => item.id === state.selectedLayerId) ?? null;

  const api = useMemo(() => {
    const mutate = (change: (project: Project) => void, selection?: Pick<Extract<EditorAction, {type:"mutate"}>, "selectSlideId"|"selectLayerId">) =>
      dispatch({ type: "mutate", change, ...selection });
    return {
      selectSlide: (id: string) => dispatch({ type: "select-slide", id }),
      selectLayer: (id: string | null) => dispatch({ type: "select-layer", id }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      addText: () => {
        const item = defaultText();
        mutate((project) => project.slides.find((candidate) => candidate.id === state.currentSlideId)?.layers.push(item), { selectLayerId: item.id });
      },
      addTextToSlide: (slideId:string) => {const item=defaultText();mutate(project=>project.slides.find(candidate=>candidate.id===slideId)?.layers.push(item),{selectSlideId:slideId,selectLayerId:item.id})},
      addImage: (url: string, name: string, slideId=state.currentSlideId) => {
        const item = defaultImage(url, name);
        mutate((project) => project.slides.find((candidate) => candidate.id === slideId)?.layers.push(item), {selectSlideId:slideId,selectLayerId:item.id});
      },
      addSlide: () => {
        const item = defaultSlide();
        mutate((project) => project.slides.push(item), { selectSlideId: item.id, selectLayerId: item.layers[0]?.id ?? null });
      },
      updateProject: (patch: Partial<Project>) => mutate((project) => Object.assign(project, patch)),
      updateLayer: (id: string, patch: Partial<Layer>) => mutate((project) => {
        const item = project.slides.flatMap((candidate) => candidate.layers).find((candidate) => candidate.id === id);
        if (item) Object.assign(item, patch);
      }),
      updateSlide: (id: string, patch: Partial<Slide>) => mutate((project) => {
        const item = project.slides.find((candidate) => candidate.id === id);
        if (item) Object.assign(item, patch);
      }),
      deleteLayer: (id: string) => {const existing=state.project.slides.find(candidate=>candidate.layers.some(item=>item.id===id));if(existing&&existing.layers.length<=1){window.alert("A slide needs at least one layer.");return}mutate(project=>{const owner=project.slides.find(candidate=>candidate.layers.some(item=>item.id===id));if(owner)owner.layers=owner.layers.filter(item=>item.id!==id)})},
      duplicateLayer: (id: string) => {const sourceOwner=state.project.slides.find(candidate=>candidate.layers.some(item=>item.id===id));const source=sourceOwner?.layers.find(item=>item.id===id);if(!source||!sourceOwner)return;const copy=structuredClone(source);copy.id=createId(copy.type);copy.x+=3;copy.y+=3;mutate(project=>{const owner=project.slides.find(candidate=>candidate.id===sourceOwner.id)!;const index=owner.layers.findIndex(item=>item.id===id);owner.layers.splice(index+1,0,copy)},{selectSlideId:sourceOwner.id,selectLayerId:copy.id})},
      moveLayer: (id: string, distance: number) => mutate((project) => {
        const owner = project.slides.find((candidate) => candidate.layers.some((item) => item.id === id));
        if (!owner) return;
        const index = owner.layers.findIndex((item) => item.id === id);
        const target = index + distance;
        if (target >= 0 && target < owner.layers.length) [owner.layers[index], owner.layers[target]] = [owner.layers[target], owner.layers[index]];
      }),
      deleteSlide: (id: string) => mutate((project) => {
        if (project.slides.length > 1) project.slides = project.slides.filter((item) => item.id !== id);
      }),
      duplicateSlide: (id: string) => {const source=state.project.slides.find(item=>item.id===id);if(!source)return;const copy=structuredClone(source);copy.id=createId("slide");copy.name=(copy.name||"Slide")+" Duplicate";copy.layers.forEach(item=>{item.id=createId(item.type)});mutate(project=>{const index=project.slides.findIndex(item=>item.id===id);project.slides.splice(index+1,0,copy)},{selectSlideId:copy.id,selectLayerId:copy.layers[0]?.id??null})},
      reorderSlides: (from: number, to: number) => mutate((project) => {
        if (from < 0 || to < 0 || from >= project.slides.length || to >= project.slides.length || from === to) return;
        const [item] = project.slides.splice(from, 1);
        project.slides.splice(to, 0, item);
      }),
      updateLayerLive:(id:string,patch:Partial<Layer>)=>dispatch({type:"mutate-live",change:project=>{const item=project.slides.flatMap(candidate=>candidate.layers).find(candidate=>candidate.id===id);if(item)Object.assign(item,patch)}}),
      checkpoint:()=>dispatch({type:"checkpoint"}),
      reorderLayers: (slideId:string,from:number,to:number)=>mutate((project)=>{
        const owner=project.slides.find(item=>item.id===slideId);if(!owner||from<0||to<0||from>=owner.layers.length||to>=owner.layers.length||from===to)return;const[item]=owner.layers.splice(from,1);owner.layers.splice(to,0,item);
      }),
      nudge: (id: string, dx: number, dy: number) => mutate((project) => {
        const item = project.slides.flatMap((candidate) => candidate.layers).find((candidate) => candidate.id === id);
        if (item && !item.locked) {
          item.x += dx;
          item.y += dy;
        }
      }),
      replaceProject: (project: Project, dirty = false) => dispatch({ type: "replace-project", project, dirty }),
      markSaving: () => dispatch({ type: "save-status", status: "saving" }),
      markSaved: () => dispatch({ type: "save-status", status: "saved" }),
      markSaveError: () => dispatch({ type: "save-status", status: "error" }),
    };
  }, [state.currentSlideId,state.project.slides]);

  return { state, slide, layer, api };
}

export type EditorApi = ReturnType<typeof useEditorState>["api"];
