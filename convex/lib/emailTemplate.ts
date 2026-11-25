// Branded, bilingual transactional email. Inline styles only (email clients). No tracking pixels.
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function magicLinkEmail(siteUrl:string,link:string,admin=false){
 const k=admin?'ADMINISTRATION ADC':'ESPACE PRIVÉ · INVESTISSEURS',fr=admin?'Confirmez votre adresse pour accéder à l’administration de la Data Room d’African Digit Consulting. Une vérification en deux étapes vous sera demandée.':'Confirmez votre adresse pour entrer dans l’espace investisseurs d’African Digit Consulting.',en=admin?'Confirm your email to access the African Digit Consulting data room administration. Two-step verification will follow.':'Confirm your email to enter the African Digit Consulting investor space.'
 const logo=new URL('/adc-logo-mark.png',siteUrl).toString(),href=esc(link)
 const html=`<!doctype html><html lang="fr"><body style="margin:0;background:#fbf7f2;font-family:Helvetica,Arial,sans-serif;color:#1a0f06">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7f2;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ece4da;border-radius:20px;overflow:hidden">
<tr><td style="height:6px;background:#e8590c;background:linear-gradient(90deg,#e8590c,#c2410c 60%,#1a5d3a)"></td></tr>
<tr><td align="center" style="padding:36px 32px 8px"><img src="${logo}" width="120" height="120" alt="African Digit Consulting" style="display:block;border:0"></td></tr>
<tr><td style="padding:8px 36px 0;text-align:center">
<p style="margin:0 0 10px;font-size:11px;letter-spacing:3px;font-weight:700;color:#c2410c">${k}</p>
<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;line-height:1.15;color:#1a0f06">Votre accès vous attend.</h1>
<p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#6b5d50">${fr} Ce lien est personnel et valable <strong>15 minutes</strong>.</p>
<a href="${href}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 30px;border-radius:12px">Confirmer mon accès &rarr;</a>
<p style="margin:26px 0 0;font-size:13px;line-height:1.6;color:#6b5d50"><em>Your access is waiting.</em> ${en} This personal link is valid for 15 minutes.</p>
</td></tr>
<tr><td style="padding:26px 36px 32px;text-align:center"><p style="margin:0;font-size:12px;line-height:1.6;color:#8a7b6d">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. / If you did not request this, ignore this email.</p></td></tr>
</table>
<p style="margin:18px 0 0;font-size:11px;color:#8a7b6d">African Digit Consulting · Investor Room · Confidentiel</p>
</td></tr></table></body></html>`
 const text=`ADC Investor Room\n\nConfirmez votre accès (lien valable 15 minutes) :\n${link}\n\nConfirm your access (valid for 15 minutes):\n${link}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.`
 return {subject:'ADC Investor Room — Votre accès vous attend / Your access is waiting',html,text}
}
