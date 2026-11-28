import {test,expect} from '@playwright/test'
test('confirmed invitation appears immediately without a full refresh',async({page})=>{
 await page.goto('/dev-preview?state=admin-invite-receipt#team')
 const email=page.getByRole('textbox',{name:'Adresse e-mail'})
 await expect(email).toBeVisible()
 await email.fill('new-admin@example.test')
 await page.getByRole('button',{name:'Créer l’invitation'}).click()
 await expect(page.getByText('new-admin@example.test',{exact:true})).toBeVisible()
 await expect(email).toHaveValue('')
})
test('unconfirmed invitation preserves input',async({page})=>{
 await page.goto('/dev-preview?state=admin-invite-fail#team')
 const email=page.getByRole('textbox',{name:'Adresse e-mail'})
 await email.fill('new-admin@example.test')
 await page.getByRole('button',{name:'Créer l’invitation'}).click()
 await expect(page.getByText('Action non confirmée',{exact:true})).toBeVisible()
 await expect(email).toHaveValue('new-admin@example.test')
})
