import {test,expect} from '@playwright/test'
test('wizard only requires identity and never claims a send',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Commencer'})).toBeEnabled();await page.getByRole('button',{name:'Commencer'}).click()
 await expect(page.getByRole('heading',{name:'Faisons connaissance.'})).toBeVisible()
 await page.getByLabel('Nom complet').fill('Test Investor');await page.getByLabel('Adresse e-mail').fill('test@example.com')
 await page.getByRole('button',{name:'Continuer'}).click()
 await page.getByRole('button',{name:'Passer'}).click();await page.getByRole('button',{name:'Passer'}).click()
 await expect(page.getByText('Aucun e-mail envoyé.',{exact:false})).toBeVisible()
})
test('private routes remain closed and lead to sign-in',async({page})=>{for(const path of ['/admin','/investor','/access']){await page.goto(path);await expect(page).toHaveURL(new RegExp('/connexion\\?next=%2F'+path.slice(1)+'$'))}})
test('auth disabled fails closed',async({request})=>{const r=await request.get('/api/auth/get-session');expect(r.status()).toBe(503)})
test('confirmation does not follow off-origin links',async({page})=>{await page.goto('/confirm#next='+encodeURIComponent('https://evil.test/api/auth/magic-link/verify?token=fake'));await expect(page.getByRole('alert')).toContainText('Lien invalide')})

test('sign-in page only accepts whitelisted destinations',async({page})=>{await page.goto('/connexion?next=https://evil.test');await expect(page.getByRole('heading',{name:'Connexion.'})).toBeVisible();await page.getByLabel('Adresse e-mail').fill('pas-un-email');await page.getByRole('button',{name:'Recevoir mon lien'}).click();await expect(page.getByRole('alert')).toContainText('adresse e-mail valide')})
for(const [w,h] of [[1366,625],[1280,580],[1440,900]]){
 test('welcome fits without overlap at '+w+'x'+h,async({page})=>{await page.setViewportSize({width:w,height:h});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
  const r=await page.evaluate(()=>{const sh=document.querySelector('.journey-shell')!,f=document.querySelector('.journey-footer')!.getBoundingClientRect(),a=document.querySelector('.journey-hero-actions')!.getBoundingClientRect();return {fits:sh.scrollHeight<=sh.clientHeight+1,overlap:a.bottom>f.top+1}})
  expect(r).toEqual({fits:true,overlap:false})})
}
