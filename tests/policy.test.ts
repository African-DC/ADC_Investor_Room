import { describe,it,expect } from 'vitest'
import { canAccess } from '../src/features/access/policy'
import type { Grant,AccessRequest } from '../src/features/access/policy'
const r:AccessRequest={userId:'u1',roomId:'r1',capability:'document:read',resourceId:'d1',now:100,published:true}
const g:Grant={userId:'u1',roomId:'r1',capability:'document:read',resourceId:'d1',effect:'allow'}
describe('authorization policy',()=>{
 it('denies by default',()=>expect(canAccess(r,[])).toBe(false))
 it('allows exact grant',()=>expect(canAccess(r,[g])).toBe(true))
 it('denies other user and room',()=>{expect(canAccess({...r,userId:'u2'},[g])).toBe(false);expect(canAccess({...r,roomId:'r2'},[g])).toBe(false)})
 it('denies other document and missing id',()=>{expect(canAccess({...r,resourceId:'d2'},[g])).toBe(false);expect(canAccess({...r,resourceId:undefined},[g])).toBe(false)})
 it('denies revoked, expired and unpublished',()=>{expect(canAccess(r,[{...g,revokedAt:0}])).toBe(false);expect(canAccess(r,[{...g,expiresAt:100}])).toBe(false);expect(canAccess({...r,published:false},[g])).toBe(false)})
 it('deny overrides allow',()=>expect(canAccess(r,[g,{...g,effect:'deny'}])).toBe(false))
 it('checks NDA and capability',()=>{expect(canAccess({...r,requiredNdaVersion:'v2',acceptedNdaVersion:'v1'},[g])).toBe(false);expect(canAccess({...r,requiredNdaVersion:'v2',acceptedNdaVersion:'v2'},[g])).toBe(true);expect(canAccess({...r,capability:'document:download'},[g])).toBe(false)})
})
