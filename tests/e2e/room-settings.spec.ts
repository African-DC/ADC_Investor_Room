import {test,expect} from '@playwright/test'
test('admin room settings expose name, creation and lifecycle',async({page})=>{
 await page.goto('/dev-preview?state=admin#settings')
 await expect(page.getByRole('heading',{name:'Configuration de la salle'})).toBeVisible()
 await expect(page.getByLabel('Nom de la salle',{exact:true})).toHaveValue('Salle de démonstration')
 await expect(page.getByRole('button',{name:'Créer une salle'})).toBeDisabled()
 await page.getByLabel('Nom de la nouvelle salle').fill('KLASSCI — Levée de fonds')
 await expect(page.getByRole('button',{name:'Créer une salle'})).toBeEnabled()
 await expect(page.getByRole('button',{name:'Archiver',exact:true})).toBeVisible()
})
