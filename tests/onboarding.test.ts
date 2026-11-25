import { it,expect } from 'vitest'
import { emptyProfile,identitySchema,profileSchema } from '../src/features/onboarding/schema'
it('requires only name and valid email',()=>{expect(profileSchema.safeParse({...emptyProfile,name:'Test Investor',email:'test@example.com'}).success).toBe(true);expect(identitySchema.safeParse({name:'',email:'invalid'}).success).toBe(false)})
it('rejects non LinkedIn URLs',()=>expect(profileSchema.safeParse({...emptyProfile,name:'Test Investor',email:'test@example.com',linkedin:'https://example.com'}).success).toBe(false))
