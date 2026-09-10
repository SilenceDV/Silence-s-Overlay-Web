"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const FXReplayContext = createContext<{id:string; version:number; replay:(id:string)=>void}>({ id: "", version: 0, replay: () => {} });
/** Editor-only ephemeral state: never enters project history, autosave or JSON. */
export function FXReplayProvider({ children }: { children: ReactNode }) {
  const [trigger, setTrigger] = useState({id:"", version:0});
  const replay = useCallback((id: string) => setTrigger(value => ({id, version:value.version + 1})), []);
  const value = useMemo(() => ({...trigger, replay}), [trigger, replay]);
  return <FXReplayContext.Provider value={value}>{children}</FXReplayContext.Provider>;
}
export const useFXReplay = () => useContext(FXReplayContext);
