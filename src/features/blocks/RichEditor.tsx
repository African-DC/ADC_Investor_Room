import { useEditor,EditorContent,useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle,Color,FontFamily,FontSize } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { useState } from 'react'
import { Bold,Italic,Underline,Strikethrough,Code,Heading2,Heading3,Pilcrow,List,ListOrdered,Quote,Minus,AlignLeft,AlignCenter,AlignRight,AlignJustify,Link2,Unlink,Eraser,Undo2,Redo2,Highlighter,Baseline,Check,X } from 'lucide-react'
import { FONTS,SIZES,COLORS,HIGHLIGHTS,safeHref,sanitizeRich } from './rich'
import type { RichNode } from './rich'
export function richExtensions(){return [
 StarterKit.configure({heading:{levels:[2,3,4]},codeBlock:false,link:{openOnClick:false,autolink:true,defaultProtocol:'https',protocols:['https','mailto'],isAllowedUri:(url)=>!!safeHref(url)}}),
 TextStyle,Color,FontFamily,FontSize,TextAlign.configure({types:['heading','paragraph']}),Highlight.configure({multicolor:true}),
]}
export function RichEditor({value,onChange}:{value:RichNode;onChange:(doc:RichNode)=>void}){
 const editor=useEditor({extensions:richExtensions(),content:value,immediatelyRender:false,editorProps:{attributes:{class:'rt rt-edit','aria-label':'Texte riche'}},onUpdate:({editor})=>{try{onChange(sanitizeRich(editor.getJSON()))}catch{/* keep last valid */}}})
 if(!editor)return <div className="rte rte-loading"/>
 return <div className="rte"><Toolbar editor={editor}/><EditorContent editor={editor}/></div>
}
function Toolbar({editor}:{editor:Editor}){
 const st=useEditorState({editor,selector:({editor:e})=>({bold:e.isActive('bold'),italic:e.isActive('italic'),underline:e.isActive('underline'),strike:e.isActive('strike'),code:e.isActive('code'),h2:e.isActive('heading',{level:2}),h3:e.isActive('heading',{level:3}),p:e.isActive('paragraph'),ul:e.isActive('bulletList'),ol:e.isActive('orderedList'),quote:e.isActive('blockquote'),link:e.isActive('link'),font:String(e.getAttributes('textStyle').fontFamily??''),size:String(e.getAttributes('textStyle').fontSize??''),align:(['center','right','justify'].find(a=>e.isActive({textAlign:a}))??'left'),undo:e.can().undo(),redo:e.can().redo()})})
 const [panel,setPanel]=useState<null|'color'|'highlight'|'link'>(null),[href,setHref]=useState('')
 const c=()=>editor.chain().focus()
 const B=({on,label,icon:I,run,disabled}:{on?:boolean;label:string;icon:typeof Bold;run:()=>void;disabled?:boolean})=><button type="button" className={'rte-b'+(on?' on':'')} aria-pressed={on} aria-label={label} title={label} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={run}><I size={16}/></button>
 return <div className="rte-bar" role="toolbar" aria-label="Mise en forme">
  <select aria-label="Police" value={st.font} onChange={e=>e.target.value?c().setFontFamily(e.target.value).run():c().unsetFontFamily().run()}><option value="">Police par défaut</option>{FONTS.map(f=><option key={f.value} value={f.value} style={{fontFamily:f.value}}>{f.label}</option>)}</select>
  <select aria-label="Taille" value={st.size} onChange={e=>e.target.value?c().setFontSize(e.target.value).run():c().unsetFontSize().run()}><option value="">Taille</option>{SIZES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
  <span className="rte-sep"/>
  <B on={st.bold} label="Gras (Ctrl+B)" icon={Bold} run={()=>c().toggleBold().run()}/><B on={st.italic} label="Italique (Ctrl+I)" icon={Italic} run={()=>c().toggleItalic().run()}/><B on={st.underline} label="Souligné (Ctrl+U)" icon={Underline} run={()=>c().toggleUnderline().run()}/><B on={st.strike} label="Barré" icon={Strikethrough} run={()=>c().toggleStrike().run()}/><B on={st.code} label="Code" icon={Code} run={()=>c().toggleCode().run()}/>
  <span className="rte-pop"><B on={panel==='color'} label="Couleur du texte" icon={Baseline} run={()=>setPanel(p=>p==='color'?null:'color')}/>{panel==='color'&&<div className="rte-panel">{COLORS.map(col=><button type="button" key={col} className="rte-sw" style={{background:col}} aria-label={'Couleur '+col} onMouseDown={e=>e.preventDefault()} onClick={()=>{c().setColor(col).run();setPanel(null)}}/>)}<button type="button" className="rte-clear" onClick={()=>{c().unsetColor().run();setPanel(null)}}>Par défaut</button></div>}</span>
  <span className="rte-pop"><B on={panel==='highlight'} label="Surligner" icon={Highlighter} run={()=>setPanel(p=>p==='highlight'?null:'highlight')}/>{panel==='highlight'&&<div className="rte-panel">{HIGHLIGHTS.map(col=><button type="button" key={col} className="rte-sw" style={{background:col}} aria-label={'Surlignage '+col} onMouseDown={e=>e.preventDefault()} onClick={()=>{c().toggleHighlight({color:col}).run();setPanel(null)}}/>)}<button type="button" className="rte-clear" onClick={()=>{c().unsetHighlight().run();setPanel(null)}}>Aucun</button></div>}</span>
  <span className="rte-sep"/>
  <B on={st.p&&!st.h2&&!st.h3} label="Paragraphe" icon={Pilcrow} run={()=>c().setParagraph().run()}/><B on={st.h2} label="Titre" icon={Heading2} run={()=>c().toggleHeading({level:2}).run()}/><B on={st.h3} label="Sous-titre" icon={Heading3} run={()=>c().toggleHeading({level:3}).run()}/>
  <span className="rte-sep"/>
  <B on={st.align==='left'} label="Aligner à gauche" icon={AlignLeft} run={()=>c().setTextAlign('left').run()}/><B on={st.align==='center'} label="Centrer" icon={AlignCenter} run={()=>c().setTextAlign('center').run()}/><B on={st.align==='right'} label="Aligner à droite" icon={AlignRight} run={()=>c().setTextAlign('right').run()}/><B on={st.align==='justify'} label="Justifier" icon={AlignJustify} run={()=>c().setTextAlign('justify').run()}/>
  <span className="rte-sep"/>
  <B on={st.ul} label="Liste à puces" icon={List} run={()=>c().toggleBulletList().run()}/><B on={st.ol} label="Liste numérotée" icon={ListOrdered} run={()=>c().toggleOrderedList().run()}/><B on={st.quote} label="Citation" icon={Quote} run={()=>c().toggleBlockquote().run()}/><B label="Séparateur" icon={Minus} run={()=>c().setHorizontalRule().run()}/>
  <span className="rte-sep"/>
  <span className="rte-pop"><B on={st.link||panel==='link'} label="Lien" icon={Link2} run={()=>{setHref(String(editor.getAttributes('link').href??'https://'));setPanel(p=>p==='link'?null:'link')}}/>{panel==='link'&&<form className="rte-panel rte-link" onSubmit={e=>{e.preventDefault();const h=safeHref(href);if(h){c().extendMarkRange('link').setLink({href:h}).run();setPanel(null)}}}><input autoFocus value={href} onChange={e=>setHref(e.target.value)} placeholder="https://…" aria-label="Adresse du lien" aria-invalid={!!href&&!safeHref(href)}/><button type="submit" className="rte-b" aria-label="Appliquer le lien" disabled={!safeHref(href)}><Check size={15}/></button><button type="button" className="rte-b" aria-label="Fermer" onClick={()=>setPanel(null)}><X size={15}/></button></form>}</span>
  {st.link&&<B label="Retirer le lien" icon={Unlink} run={()=>c().unsetLink().run()}/>}
  <B label="Effacer la mise en forme" icon={Eraser} run={()=>c().unsetAllMarks().clearNodes().run()}/>
  <span className="rte-sep"/>
  <B label="Annuler (Ctrl+Z)" icon={Undo2} disabled={!st.undo} run={()=>c().undo().run()}/><B label="Rétablir" icon={Redo2} disabled={!st.redo} run={()=>c().redo().run()}/>
 </div>
}
