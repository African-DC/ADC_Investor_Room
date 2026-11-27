import {test,expect} from '@playwright/test'
for(const viewport of [{width:1317,height:605},{width:1024,height:600},{width:390,height:844},{width:320,height:568}]){
 test('form and footer do not overlap '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/')
  await page.getByRole('button',{name:'Commencer'}).click()
  const panel=page.locator('.journey-panel'),footer=page.locator('.journey-footer')
  const check=async()=>{const p=await panel.boundingBox(),f=await footer.boundingBox();expect(p).not.toBeNull();expect(f).not.toBeNull();expect(f!.y).toBeGreaterThanOrEqual(p!.y+p!.height-1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
  await expect(page.getByRole('heading',{name:'Faisons connaissance.'})).toBeVisible();await check()
  await expect(page.locator('.journey-story .journey-quiet')).toHaveCount(0)
  await page.getByLabel('Nom complet').fill('Test Investor');await page.getByLabel('Adresse e-mail').fill('test@example.com');await page.getByRole('button',{name:'Continuer'}).click();await check()
 })
}
test('admin login offers link or OTP and mandatory MFA',async({page})=>{
 await page.goto('/connexion?next=/admin');await expect(page.getByRole('button',{name:'Lien par e-mail'})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Code OTP'}).click();await expect(page.getByRole('button',{name:'Recevoir mon code'})).toBeVisible();await expect(page.getByText(/Authenticator reste obligatoire/)).toBeVisible()
 await page.getByRole('button',{name:'Lien par e-mail'}).click();await expect(page.getByRole('button',{name:'Recevoir mon lien'})).toBeVisible()
})
