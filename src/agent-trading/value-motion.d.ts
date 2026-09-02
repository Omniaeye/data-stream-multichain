export function createValueMotion(duration?:number):{at(now:number):number|null;active(now:number):boolean;set(value:number|null,now:number,instant?:boolean):boolean};
