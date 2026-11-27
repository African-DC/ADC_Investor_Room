import {useEffect,useRef,useState} from 'react'
import { Search,X } from 'lucide-react'
export function SearchField({value,onChange,label,clearLabel='Effacer la recherche'}:{value:string;onChange:(value:string)=>void;label:string;clearLabel?:string}){
 const [ready,setReady]=useState(false),input=useRef<HTMLInputElement>(null)
 useEffect(()=>setReady(true),[])
 return <div className="room-search"><Search size={18} aria-hidden="true"/><input ref={input} disabled={!ready} type="search" aria-label={label} placeholder={label} value={value} onChange={event=>onChange(event.target.value)}/>{value&&<button type="button" className="sdk-clear" aria-label={clearLabel} onClick={()=>{onChange('');input.current?.focus()}}><X size={17} aria-hidden="true"/></button>}</div>
}
