import {expect,it} from 'vitest'
import {permits,currentPublication} from '../convex/lib/roomPolicy'
import type {Doc,Id} from '../convex/_generated/dataModel'
const room={_id:'room1' as Id<'rooms'>,status:'published' as const,ndaVersion:'v2'}
const other={...room,_id:'room2' as Id<'rooms'>}
const grant={authUserId:'u1',roomId:room._id,capability:'room:read',effect:'allow' as const}
it('only lists explicitly granted published rooms; NDA still gates content',()=>{
 expect(permits('u1',room,[grant],100,'room:read',undefined,undefined,true)).toBe(true)
 expect(permits('u1',room,[grant],100,'room:read')).toBe(false)
 expect(permits('u1',room,[grant],100,'room:read',undefined,'v1')).toBe(false)
 expect(permits('u1',room,[grant],100,'room:read',undefined,'v2')).toBe(true)
 expect(permits('u2',room,[grant],100,'room:read',undefined,'v2')).toBe(false)
 expect(permits('u1',other,[grant],100,'room:read',undefined,'v2')).toBe(false)
 expect(permits('u1',{...room,status:'draft'},[grant],100,'room:read',undefined,'v2')).toBe(false)
})
it('requires explicit section permission, rejects direct ID, deny wins, expiry and revocation',()=>{
 const section={...grant,capability:'section:read',resourceId:'s1'}
 expect(permits('u1',room,[grant],100,'section:read','s1','v2')).toBe(false)
 expect(permits('u1',room,[section],100,'section:read','s1','v2')).toBe(true)
 expect(permits('u1',room,[section],100,'section:read','s2','v2')).toBe(false)
 expect(permits('u1',room,[section,{...section,effect:'deny'}],100,'section:read','s1','v2')).toBe(false)
 expect(permits('u1',room,[{...section,expiresAt:100}],100,'section:read','s1','v2')).toBe(false)
 expect(permits('u1',room,[{...section,revokedAt:90}],100,'section:read','s1','v2')).toBe(false)
})
it('projects only the exact published revision without private source or author',()=>{
 const section={_id:'s1' as Id<'sections'>,roomId:room._id,publishedVersionId:'v1' as Id<'sectionVersions'>}
 const version:Doc<'sectionVersions'>={_id:section.publishedVersionId,_creationTime:0,sectionId:section._id,roomId:room._id,version:1,titleFr:'Titre',titleEn:'Title',bodyFr:'Texte',bodyEn:'Text',source:'private-source',authorId:'operator',state:'published',createdAt:0}
 const projection=currentPublication(section,version)
 expect(projection).toEqual({id:section._id,titleFr:'Titre',titleEn:'Title',bodyFr:'Texte',bodyEn:'Text',blocksFr:null,blocksEn:null,publishedAt:0})
 expect(currentPublication(section,{...version,state:'draft'})).toBeNull()
 expect(currentPublication(section,{...version,roomId:other._id})).toBeNull()
 expect(currentPublication(section,{...version,_id:'v2' as Id<'sectionVersions'>})).toBeNull()
})
