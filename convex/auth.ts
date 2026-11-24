import { betterAuth } from 'better-auth/minimal'
import { magicLink } from 'better-auth/plugins'
import { createClient } from '@convex-dev/better-auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import authConfig from './auth.config'
export const authComponent=createClient<DataModel>(components.betterAuth)
function required(name:string){const value=process.env[name];if(!value)throw new Error('Authentication configuration missing');return value}
export const createAuth=(ctx:GenericCtx<DataModel>)=>{
 const siteUrl=required('SITE_URL')
 return betterAuth({
  baseURL:siteUrl,secret:required('BETTER_AUTH_SECRET'),database:authComponent.adapter(ctx),
  trustedOrigins:[siteUrl],emailAndPassword:{enabled:false},
  rateLimit:{enabled:true,storage:'database',window:60,max:20},
  session:{expiresIn:60*60*24,updateAge:60*60},
  plugins:[magicLink({expiresIn:900,storeToken:'hashed',rateLimit:{window:60,max:3},
   sendMagicLink:async({email,url})=>{
    const target=new URL(url,siteUrl)
    if(target.origin!==new URL(siteUrl).origin||target.pathname!=='/api/auth/magic-link/verify')throw new Error('Invalid verification URL')
    const confirm=new URL('/confirm',siteUrl)
    confirm.hash=new URLSearchParams({next:target.pathname+target.search}).toString()
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+required('RESEND_API_KEY'),'Content-Type':'application/json'},body:JSON.stringify({from:required('MAIL_FROM'),to:[email],subject:'ADC Investor Room — Vérifiez votre accès / Verify your access',text:'Confirmez votre connexion / Confirm your sign-in: '+confirm.toString()+'\nLien valable 15 minutes / Valid for 15 minutes. Ignore if you did not request it.'})})
    if(!response.ok)throw new Error('Email service unavailable')
   }
  }),convex({authConfig})]
 })
}
