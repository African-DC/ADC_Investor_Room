import {test,expect} from '@playwright/test'
test('wizard only requires identity and never claims a send',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'Commencer'})).toBeEnabled();await page.getByRole('button',{name:'Commencer'}).click()
 await expect(page.getByRole('heading',{name:'Faisons connaissance.'})).toBeVisible()
 await page.getByLabel('Nom complet').fill('Test Investor');await page.getByLabel('Adresse e-mail').fill('test@example.com')
 await page.getByRole('button',{name:'Continuer'}).click()
 await page.getByRole('button',{name:'Passer'}).click();await page.getByRole('button',{name:'Passer'}).click()
 await expect(page.getByText('Aucun e-mail envoyé.',{exact:false})).toBeVisible()
})
test('private routes remain closed',async({page})=>{for(const path of ['/admin','/investor','/access']){await page.goto(path);await expect(page).toHaveURL(/\/$/)}})
test('auth disabled fails closed',async({request})=>{const r=await request.get('/api/auth/get-session');expect(r.status()).toBe(503)})
test('confirmation does not follow off-origin links',async({page})=>{await page.goto('/confirm#next='+encodeURIComponent('https://evil.test/api/auth/magic-link/verify?token=fake'));await expect(page.getByRole('alert')).toContainText('Lien invalide')})
