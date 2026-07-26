export const isEditableTarget=(t:EventTarget|null)=>t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement;
export const nudgeAmount=(shift:boolean)=>shift?1:0.1;
