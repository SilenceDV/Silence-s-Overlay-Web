/** Hosted-only scheduler. No frame loop exists when neither FX nor diagnostics need it. */
export const hostedProfiles = [
  {name:"high", resolution:1, trailSamples:5, glowPasses:4},
  {name:"balanced", resolution:.85, trailSamples:4, glowPasses:3},
  {name:"economy", resolution:.7, trailSamples:3, glowPasses:3},
] as const;

export class QualityPolicy {
  tier=0;
  private elapsed=0;
  private samples=0;
  private slow=0;
  private healthy=0;
  sample(delta:number,cost:number) {
    // Ignore tab suspension/debugger gaps; require sustained pressure, not one spike.
    if(delta<=0||delta>100)return;
    this.elapsed+=delta;this.samples++;
    if(delta>22||cost>10)this.slow++;
    if(this.elapsed<1500)return;
    if(this.slow/this.samples>.35){this.tier=Math.min(2,this.tier+1);this.healthy=0;}
    else if(this.slow/this.samples<.05){
      if(++this.healthy>=5){this.tier=Math.max(0,this.tier-1);this.healthy=0;}
    }else this.healthy=0;
    this.elapsed=0;this.samples=0;this.slow=0;
  }
}

type Job={draw:(now:number)=>boolean; particles:number|(()=>number);canvases:number};
export class HostedPerformance {
  readonly quality=new QualityPolicy();
  private jobs=new Set<Job>();
  private frame:number|null=null;
  private previous:number|null=null;
  private diagnostics=false;
  private lastReport=0;
  private frames=0;
  private frameTime=0;
  private cost=0;
  private slides=0;
  private layers=0;
  get profile(){return hostedProfiles[this.quality.tier];}
  setContent(slides:number,layers:number){this.slides=slides;this.layers=layers;}
  setDiagnostics(enabled:boolean){this.diagnostics=enabled;this.schedule();this.stopIfIdle();}
  add(draw:Job["draw"],particles:Job["particles"],canvases:number){
    const job={draw,particles,canvases};this.jobs.add(job);this.schedule();
    return ()=>{this.jobs.delete(job);this.stopIfIdle();};
  }
  snapshot(){
    let particles=0,canvases=0;
    for(const job of this.jobs){particles+=typeof job.particles==="number"?job.particles:job.particles();canvases+=job.canvases;}
    const average=this.frames?this.frameTime/this.frames:0;
    return {averageFrameMs:average,fps:average?1000/average:0,vfxFrameMs:this.frames?this.cost/this.frames:0,
      activeCanvases:canvases,activeParticles:particles,quality:this.profile.name,slideCount:this.slides,activeLayers:this.layers};
  }
  private stopIfIdle(){
    if(this.jobs.size||this.diagnostics)return;
    if(this.frame!==null)cancelAnimationFrame(this.frame);
    this.frame=null;this.previous=null;
  }
  private schedule(){if(this.frame===null&&(this.jobs.size||this.diagnostics))this.frame=requestAnimationFrame(this.tick);}
  private tick=(now:number)=>{
    this.frame=null;
    if(document.hidden){this.previous=null;return;}
    const delta=this.previous===null?0:now-this.previous;this.previous=now;
    const start=performance.now();
    for(const job of this.jobs)if(!job.draw(now))this.jobs.delete(job);
    const cost=performance.now()-start;
    if(delta>0&&delta<=100){
      this.quality.sample(delta,cost);this.frames++;this.frameTime+=delta;this.cost+=cost;
    }
    if(this.diagnostics&&now-this.lastReport>=5000){
      console.info("[overlay perf]",this.snapshot());this.lastReport=now;
      this.frames=0;this.frameTime=0;this.cost=0;
    }
    this.schedule();this.stopIfIdle();
  };
  resume(){this.previous=null;this.schedule();}
  dispose(){this.jobs.clear();this.diagnostics=false;this.stopIfIdle();}
}
