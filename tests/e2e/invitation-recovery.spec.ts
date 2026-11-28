import {test,expect} from '@playwright/test'
test('missing invitation gives a recovery instruction, not an invalid link error',async({page})=>{
 await page.goto('/invite')
 await expect(page.getByRole('heading',{name:'Invitation à rouvrir.'})).toBeVisible()
})
test('invitation sign-in defaults to email OTP to stay in the same browser',async({page})=>{
 await page.goto('/connexion?next=%2Finvite')
 await expect(page.getByRole('button',{name:'Code OTP'})).toHaveAttribute('aria-pressed','true')
})
test('room entry is not presented as all sections',async({page})=>{
 await page.goto('/dev-preview?state=admin#access')
 await page.getByRole('tab',{name:/Liens temporaires/}).click()
 await expect(page.getByText('Entrée dans la salle (sélectionner aussi les rubriques ou documents)',{exact:true})).toBeVisible()
})
