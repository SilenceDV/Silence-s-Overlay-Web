import React,{useState} from "react";
import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {VisualFXSelect} from "@/components/editor/VisualFXSelect";
import {ImageLayerControls} from "@/components/editor/ImageLayerControls";
import {defaultImage} from "@/lib/editor/defaults";
import {visualEffects,fxPalettes} from "@/lib/editor/visualFx";
import type {VisualEffectType} from "@/types/editor";

beforeEach(()=>{vi.stubGlobal("React",React);vi.spyOn(HTMLElement.prototype,"getBoundingClientRect").mockReturnValue({x:10,y:50,left:10,right:310,top:50,bottom:90,width:300,height:40,toJSON:()=>({})})});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
it("replaces only the Visual FX select and applies the existing palette on selection",()=>{
 const change=vi.fn();const view=render(<ImageLayerControls layer={defaultImage("","Gift")} onChange={change} onReplace={()=>{}}/>);
 expect(view.container.querySelectorAll("select")).toHaveLength(1);
 expect(view.container.querySelector("select")?.textContent).toContain("Pop In");
 fireEvent.click(screen.getByRole("combobox",{name:"Visual FX"}));
 const menu=screen.getByRole("listbox");expect(menu.style.backgroundColor).toBe("rgb(36, 36, 45)");
 expect(menu.style.position).toBe("fixed");expect(menu.parentElement).toBe(document.body);
 expect(screen.getAllByRole("option").filter(el=>el.closest('[role="listbox"]'))).toHaveLength(visualEffects.length);
 fireEvent.click(screen.getByRole("option",{name:"Fire Burst"}));
 expect(change).toHaveBeenCalledWith({burstEffect:"fxFireBurst",fxPrimaryColor:fxPalettes.fxFireBurst[0],fxSecondaryColor:fxPalettes.fxFireBurst[1]});
 expect(screen.queryByRole("listbox")).toBeNull();
});
it("supports arrows, Home/End, typeahead and Enter with selected indication",()=>{
 function Fixture(){const [value,setValue]=useState<VisualEffectType>("none");return <VisualFXSelect value={value} onChange={setValue}/>}
 render(<Fixture/>);const trigger=screen.getByRole("combobox");trigger.focus();
 fireEvent.keyDown(trigger,{key:"ArrowDown"});fireEvent.keyDown(trigger,{key:"ArrowDown"});fireEvent.keyDown(trigger,{key:"Enter"});
 expect(trigger.textContent).toContain("Impact / Explosion");expect(document.activeElement).toBe(trigger);
 fireEvent.keyDown(trigger,{key:" "});expect(screen.getByRole("option",{name:"Impact / Explosion"}).getAttribute("aria-selected")).toBe("true");
 fireEvent.keyDown(trigger,{key:"End"});expect(document.getElementById(trigger.getAttribute("aria-activedescendant")!)?.textContent).toContain("Glitch");
 fireEvent.keyDown(trigger,{key:"Home"});expect(document.getElementById(trigger.getAttribute("aria-activedescendant")!)?.textContent).toContain("None");
 fireEvent.keyDown(trigger,{key:"s"});fireEvent.keyDown(trigger,{key:"p"});fireEvent.keyDown(trigger,{key:"Enter"});expect(trigger.textContent).toContain("Spark Burst");
});
it("dismisses on outside pointer, Escape, Tab, focus departure and sidebar scroll without committing",()=>{
 const change=vi.fn();render(<><VisualFXSelect value="none" onChange={change}/><button>Outside</button></>);
 const trigger=screen.getByRole("combobox"),outside=screen.getByText("Outside");
 for(const dismiss of [()=>fireEvent.pointerDown(outside),()=>fireEvent.keyDown(trigger,{key:"Escape"}),()=>fireEvent.keyDown(trigger,{key:"Tab"}),()=>act(()=>outside.focus()),()=>fireEvent.scroll(window)]){
   trigger.focus();fireEvent.click(trigger);expect(screen.queryByRole("listbox")).not.toBeNull();dismiss();expect(screen.queryByRole("listbox")).toBeNull();
 }
 expect(change).not.toHaveBeenCalled();
});
it("keeps the menu open during internal scrolling and supports legacy values",()=>{
 const change=vi.fn();const view=render(<VisualFXSelect value="fxShockwave" onChange={change}/>);const trigger=screen.getByRole("combobox");
 expect(trigger.textContent).toContain("Shockwave");fireEvent.click(trigger);fireEvent.scroll(screen.getByRole("listbox"));
 expect(screen.getByRole("option",{name:"Shockwave"}).getAttribute("aria-selected")).toBe("true");
 view.unmount();expect(screen.queryByRole("listbox")).toBeNull();fireEvent.pointerDown(document.body);
});
