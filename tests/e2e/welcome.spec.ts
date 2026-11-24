import { test,expect } from '@playwright/test'
test('wizard only requires identity and never claims a send',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Commencer'}).click()
 await page.getByLabel('Nom complet').fill('Test Investor');await page.getByLabel('Adresse e-mail').fill('test@example.com')
 await page.getByRole('button',{name:'Continuer'}).click()
 await page.getByRole('button',{name:'Passer'}).click();await page.getByRole('button',{name:'Passer'}).click()
 await expect(page.getByText('Aucun e-mail envoyé.',{exact:false})).toBeVisible()
})
test('private routes remain closed',async({page})=>{await page.goto('/admin');await expect(page).toHaveURL(/\/$/);await page.goto('/investor');await expect(page).toHaveURL(/\/$/)})
