import {expect,it} from 'vitest'
import {adminInvitationEmail} from '../convex/lib/emailTemplate'
it('direct invitation has a confirmation link and expiry recovery',()=>{
 const site='https://example.com',link=site+'/confirm#next=%2Fapi%2Fauth%2Fmagic-link%2Fverify%3Ftoken%3Dfixture'
 const result=adminInvitationEmail(site,link,'12 décembre')
 expect(result.html).toContain(link);expect(result.text).toContain(link)
 expect(result.text).toContain('15 minutes');expect(result.text).toContain('/connexion?next=%2Fadmin')
})
