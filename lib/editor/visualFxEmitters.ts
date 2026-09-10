export type EmitterStrategy = "center" | "perimeter" | "surface" | "fullArea" | "bottomEdge" | "multiPoint";
export interface FXOrigin { x:number; y:number; nx:number; ny:number; index:number }
/** Seeded art-direction regions, not equally spaced points on a mathematical ring. */
export function createEmitters(width:number,height:number,random:()=>number) {
  const range=(a:number,b:number)=>a+(b-a)*random();
  const point=(x:number,y:number,index:number):FXOrigin=>({x:x*width,y:y*height,nx:x,ny:y,index});
  const origins=[point(range(-.41,-.25),range(-.38,-.18),0),point(range(.23,.4),range(-.22,-.05),1),
    point(range(-.18,.07),range(.25,.42),2),point(range(.3,.47),range(.18,.36),3),
    point(range(-.48,-.3),range(.12,.34),4),point(range(-.1,.12),range(-.48,-.32),5)];
  const sample=(strategy:EmitterStrategy,index=0):FXOrigin=>{
    switch(strategy){
      case "center":return point(range(-.1,.1),range(-.1,.1),index);
      case "surface":return point(range(-.43,.43),range(-.43,.43),index);
      case "fullArea":return point(range(-.62,.62),range(-.62,.62),index);
      case "bottomEdge":return point(range(-.47,.47),range(.34,.49),index);
      case "multiPoint":{const origin=origins[index%origins.length];return {...origin,x:origin.x+range(-.055,.055)*width,y:origin.y+range(-.05,.05)*height};}
      case "perimeter":{
        const along=range(-.48,.48),edge=range(.43,.54);
        switch(index%4){case 0:return point(along,-edge,index);case 1:return point(edge,along,index);case 2:return point(along,edge,index);default:return point(-edge,along,index);}
      }
    }
  };
  return {origins,sample};
}
