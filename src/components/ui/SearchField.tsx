import { Input,InputClear,InputGroup } from '@ui-sdk/react/input'
import { Search,X } from 'lucide-react'
export function SearchField({value,onChange,label,clearLabel='Effacer la recherche'}:{value:string;onChange:(value:string)=>void;label:string;clearLabel?:string}){
 return <InputGroup className="room-search"><Search size={18} aria-hidden="true"/><Input type="search" aria-label={label} placeholder={label} value={value} onValueChange={onChange}/><InputClear className="sdk-clear" aria-label={clearLabel}><X size={17} aria-hidden="true"/></InputClear></InputGroup>
}
