import { z } from 'zod'
const optionalText = z.string().trim().max(160)
export const identitySchema = z.object({name:z.string().trim().min(2).max(120),email:z.email().trim().max(254)})
export const profileSchema = identitySchema.extend({
 organization:optionalText, type:z.enum(['','angel','vc','institution','partner','other']),
 role:optionalText, phone:z.string().trim().max(40),
 linkedin:z.string().trim().max(300).refine(v=>!v||/^https:\/\/(www\.)?linkedin\.com\//i.test(v),'Invalid LinkedIn URL'),
})
export type Profile = z.infer<typeof profileSchema>
export const emptyProfile:Profile={name:'',email:'',organization:'',type:'',role:'',phone:'',linkedin:''}
