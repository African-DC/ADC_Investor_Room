import {test,expect} from '@playwright/test'
const sizes=[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1024,height:600},{width:1440,height:900}]
for(const viewport of sizes){
 test('journey is usable at '+viewport.width+'x'+viewport.height,async({page},info)=>{
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
  const logo=page.locator('.journey-hero-logo');await expect(logo).toBeVisible()
  expect(await logo.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0)
  expect((await logo.boundingBox())!.width).toBeGreaterThanOrEqual(140)
  const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
  await noOverflow()
  expect(await page.locator('.journey-shell').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(viewport.height-1)
  await page.screenshot({path:info.outputPath('01-welcome.png'),fullPage:true,animations:'disabled'})
  await page.getByRole('button',{name:'Commencer'}).click();await expect(page.getByRole('heading',{name:'Faisons connaissance.'})).toBeFocused()
  await page.getByLabel('Nom complet').fill('Test Investor');await page.getByLabel('Adresse e-mail').fill('test@example.com')
  await page.getByRole('button',{name:'Continuer'}).click();await expect(page.getByRole('heading',{name:'Parlez-nous de vous.'})).toBeVisible()
  await page.getByLabel('Organisation').fill('Test Organization');await noOverflow()
  await page.screenshot({path:info.outputPath('03-profile.png'),fullPage:true,animations:'disabled'})
  await page.getByRole('button',{name:'Retour',exact:true}).click();await expect(page.getByLabel('Nom complet')).toHaveValue('Test Investor')
  await page.getByRole('button',{name:'Continuer'}).click();await expect(page.getByLabel('Organisation')).toHaveValue('Test Organization')
  await page.getByRole('button',{name:'Passer',exact:true}).click();await page.getByRole('button',{name:'Passer',exact:true}).click()
  await expect(page.getByText('Aucun e-mail envoyé.',{exact:false})).toBeVisible();await noOverflow()
  await page.getByRole('button',{name:'Retour',exact:true}).click();await expect(page.getByRole('heading',{name:'Gardons le lien.'})).toBeVisible()
 })
}
test('language and explicit sound toggle preserve form and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
 const sound=page.getByRole('button',{name:'Activer le son'})
 await expect(sound).toHaveAttribute('aria-pressed','false');await sound.click()
 await expect(page.getByRole('button',{name:'Couper le son'})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Couper le son'}).click();await expect(sound).toHaveAttribute('aria-pressed','false')
 await page.getByRole('button',{name:'Commencer'}).click();await page.getByLabel('Nom complet').fill('Test Investor')
 await page.getByRole('button',{name:'Switch to English'}).click();await expect(page.getByLabel('Full name')).toHaveValue('Test Investor')
 await expect(page.locator('.journey-chapter')).toHaveCSS('animation-name','none')
})
