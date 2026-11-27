# CRM — suivi de la levée ADC

CRM privé, distinct des droits documentaires. Les données sont rattachées à une salle. Les membres doivent posséder une autorisation CRM et une preuve MFA valide. L'affectation cible les membres non révoqués de cette salle autorisés à modifier le CRM. Aucun changement commercial ne crée de droit investisseur.

Devise XOF (FCFA), entiers de 0 à 1 000 000 000 000. Vide signifie non renseigné, non zéro. Objectif facultatif configurable par salle. Pipeline envisagé : contacts ouverts hors engagements. Engagements déclarés : dossiers engagé/clôturé, montants explicitement saisis. Pas de double comptage. Engagements distincts des fonds encaissés et des preuves juridiques. Les dossiers engagés/clôturés sans montant sont signalés. Une étape non engagée ne peut conserver un engagement sans effacement explicite.

L'objectif utilise une comparaison de valeur précédente; les fiches utilisent une révision. Une action et sa date UTC permettent de filtrer les échéances. Les notes peuvent être classées par appel, e-mail, rendez-vous, relance ou note. Ce classement n'envoie pas d'e-mail ni d'invitation calendrier. Les événements ne sont pas visibles par l'investisseur. Champs optionnels compatibles avec les données existantes; limite actuelle de 100 dossiers et 100 membres par salle, à paginer avant passage à plus grande échelle.

Recette réelle : lecture/écriture selon rôles, affectations, montants, étapes, objectif, non-divulgation et conservation des accès. Intégrations calendrier, relances automatiques, preuve d'encaissement et scoring consenti hors de ce lot.
