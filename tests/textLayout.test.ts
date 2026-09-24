import {afterEach,expect,it,vi} from "vitest";
import {measureTextGlyphs,splitTextGlyphs} from "@/lib/editor/textLayout";
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks()});
const rect=(left:number,top:number,width:number,height=64)=>({left,top,width,height,x:left,y:top,right:left+width,bottom:top+height,toJSON:()=>({})}) as DOMRect;
it("measures fractional kerning and word spaces from one shaped text node outside stage transforms",()=>{
 const source=document.createElement("span");source.textContent="SPAWN POO";
 source.style.cssText="display:block;width:359.5625px;font-size:64px;line-height:64px;letter-spacing:2px;word-spacing:3px;white-space:pre-wrap;transform:scale(.25) rotate(30deg)";
 document.body.appendChild(source);
 const xs=[0,35.96875,72.78125,112.5,172.28125,219.3125,233.8125,273.9375,316.75,359.5625];
 let start=0,end=0,node:Node|null=null,ruler:HTMLElement|null=null;
 vi.spyOn(HTMLElement.prototype,"getBoundingClientRect").mockReturnValue(rect(-100000,0,359.5625));
 vi.spyOn(document,"createRange").mockImplementation(()=>({
  setStart:(text:Node,n:number)=>{node=text;start=n;ruler=text.parentElement;},setEnd:(_text:Node,n:number)=>{end=n;},collapse:()=>{end=start;},
  getBoundingClientRect:()=>rect(-100000+xs[start],-5,xs[end]-xs[start],74)
 }) as unknown as Range);
 const positions=measureTextGlyphs(source,splitTextGlyphs(source.textContent));
 expect((node as unknown as Node).textContent).toBe("SPAWN POO");
 const measured=ruler as unknown as HTMLElement;
 expect(measured.style.transform).toBe("");expect(measured.style.letterSpacing).toBe("2px");expect(measured.style.wordSpacing).toBe("3px");
 expect(positions.map(p=>p.x)).toEqual(xs.slice(0,-1));
 expect(positions[5].width).toBe(14.5);expect(positions[6].x).toBe(233.8125);
 expect(positions.every(p=>p.fieldWidth===359.5625&&p.y===0&&p.height===64)).toBe(true);
 expect(measured.isConnected).toBe(false);expect(document.body.children).toHaveLength(1);
});
it("preserves centered multiline positions and gives each visible row its own field",()=>{
 const source=document.createElement("span");source.textContent="A B\n\nC";source.style.cssText="width:200px;font-size:50px;line-height:50px;white-space:pre-wrap;text-align:center";document.body.appendChild(source);
 let start=0,end=0;
 const boxes:Record<number,DOMRect>={0:rect(-99960,-4,30),1:rect(-99930,-4,15),2:rect(-99915,-4,30),5:rect(-99920,96,30)};
 vi.spyOn(HTMLElement.prototype,"getBoundingClientRect").mockReturnValue(rect(-100000,0,200,150));
 vi.spyOn(document,"createRange").mockImplementation(()=>({setStart:(_node:Node,n:number)=>{start=n;},setEnd:(_node:Node,n:number)=>{end=n;},collapse:()=>{end=start;},getBoundingClientRect:()=>start===end?rect(-99960,-4,0):boxes[start]}) as unknown as Range);
 expect(measureTextGlyphs(source,splitTextGlyphs(source.textContent))).toEqual([
  {x:40,y:0,width:30,height:50,fieldX:0,fieldWidth:75},
  {x:70,y:0,width:15,height:50,fieldX:30,fieldWidth:75},
  {x:85,y:0,width:30,height:50,fieldX:45,fieldWidth:75},
  {x:80,y:100,width:30,height:50,fieldX:0,fieldWidth:30}
 ]);
});
it("keeps UTF-16 range offsets for joined emoji, accents and whitespace",()=>{
 const text="A 👩‍🚀\n\né";const glyphs=splitTextGlyphs(text);
 expect(glyphs.map(g=>g.text)).toEqual(["A"," ","👩‍🚀","é"]);
 for(const glyph of glyphs)expect(text.slice(glyph.start,glyph.end)).toBe(glyph.text);
 expect(glyphs[2]).toMatchObject({start:2,end:7});expect(glyphs[3]).toMatchObject({start:9,end:11});
});
it("removes its temporary ruler even if a range read fails",()=>{
 const source=document.createElement("div");source.textContent="A";document.body.appendChild(source);
 vi.spyOn(document,"createRange").mockImplementation(()=>{throw new Error("range failure")});
 expect(()=>measureTextGlyphs(source,splitTextGlyphs("A"))).toThrow("range failure");expect(document.body.children).toHaveLength(1);
});
