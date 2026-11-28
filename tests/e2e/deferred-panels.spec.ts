import {test,expect} from '@playwright/test'
test('mobile admin can navigate deferred sections without losing its shell',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/dev-preview?state=admin')
 await expect(page.getByRole('heading',{name:'Tableau de bord'})).toBeVisible()
 await page.getByRole('button',{name:'Ouvrir le menu'}).click()
 await page.getByRole('button',{name:/Équipe ADC/}).click()
 await expect(page.getByRole('heading',{name:'Inviter un administrateur'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Équipe ADC',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Ouvrir le menu'}).click()
 await page.getByRole('button',{name:/Paramètres des salles/}).click()
 await expect(page.getByRole('heading',{name:'Configuration de la salle'})).toBeVisible()
})
