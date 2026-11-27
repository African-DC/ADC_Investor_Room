import {test,expect} from '@playwright/test'
test('fundraising CRM exposes target, declared commitments and assigned filters',async({page})=>{
 await page.goto('/dev-preview?state=admin#crm')
 await expect(page.getByRole('heading',{name:'Pilotage de la levée'})).toBeVisible()
 await expect(page.getByText('Engagements déclarés / objectif : 10 %',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Configurer l’objectif'}).click()
 await expect(page.getByLabel('Objectif de levée (FCFA)')).toHaveValue('100000000')
 await page.getByRole('button',{name:'Annuler',exact:true}).click()
 await page.getByLabel('Responsable',{exact:true}).selectOption('self')
 await expect(page.getByRole('heading',{name:'Autre Démo',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Investisseur Démo',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Ouvrir la fiche'}).click()
 await expect(page.getByLabel('Engagement déclaré (FCFA)')).toHaveValue('10000000')
})
