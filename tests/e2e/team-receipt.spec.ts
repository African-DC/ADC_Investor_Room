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

test('confirmed investor link appears in access links immediately',async({page})=>{
 await page.goto('/dev-preview?state=admin#access')
 await page.getByRole('tab',{name:/Liens temporaires/}).click()
 await page.getByLabel('Nom du lien').fill('Lien de recette')
 await page.getByRole('button',{name:'Générer le lien'}).click()
 await expect(page.getByText('Lien de recette',{exact:true})).toBeVisible()
 await expect(page.getByText('Lien investisseur prêt.',{exact:true})).toBeVisible()
})
