// Official product identities, sourced from African-DC/adc-website (public/img/projets/*).
export type ProductBrand={name:string;logo:string;accent:string;tint:string}
export const productBrands:Record<string,ProductBrand>={
 klassci:{name:'KLASSCI',logo:'/logo-klassci.png',accent:'#0052cc',tint:'#eaf1fc'},
 wouri:{name:'WOURI',logo:'/logo-wouri.png',accent:'#1a5d3a',tint:'#e8f3ec'},
}
export function brandFor(slug?:string):ProductBrand|null{
 if(!slug)return null
 const key=slug.toLowerCase()
 return productBrands[key]??Object.entries(productBrands).find(([k])=>key.startsWith(k+'-'))?.[1]??null
}
