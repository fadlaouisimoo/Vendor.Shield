# Rapport de Gouvernance — VendorShield

## Analyse de Risques (Supply Chain)
- Compromission d'un fournisseur: **pivot** vers le SI interne via accès tiers (VPN, portail, API).
- Logiciels fournis: **cheval de Troie** (dépendances, mises à jour compromises, typosquatting).
- Manque de maturité sécurité: **absence de MFA**, correctifs en retard, sauvegardes non testées.
- Données partagées: **fuite/confidentialité** (RGPD, secrets). Risques contractuels.
- Continuité d'activité: **indisponibilité** d'un sous-traitant critique (PRA/PCI insuffisant).

## Politique de Sécurité des Fournisseurs (extrait – 5 exigences)
1. Antivirus/EDR déployé et **à jour** sur tous les endpoints.
2. **Authentification multi-facteurs** obligatoire pour tout accès distant/sensible.
3. **Plan de Reprise d'Activité (PRA)** documenté et **testé** au moins annuellement.
4. **Gestion des correctifs** (OS et applicatifs) avec délais max (critique < 15j, haut < 30j).
5. **Sauvegardes chiffrées**, déconnectées (3-2-1) et **tests de restauration** trimestriels.

## Processus de Suivi
1. **Invitation**: l'équipe crée le fournisseur dans `VendorShield` et envoie le lien d'auto-évaluation.
2. **Auto-évaluation**: le fournisseur répond Oui/Non/N.A., dépose des **preuves**.
3. **Validation**: l'équipe sécurité examine les réponses et les preuves.
4. **Score**: calcul automatisé (pondération) et **statut** (Conforme/En cours/Non conforme).
5. **Remédiation**: plan d'actions, nouvel envoi, suivi jusqu'à conformité.

## Indicateurs (KPIs) pour le tableau de bord RSSI
- % de **fournisseurs conformes** (objectif ≥ 80%).
- **Nombre de risques critiques** identifiés (Non conformes) et leur tendance.
- **Délai moyen de mise en conformité** (création → statut Conforme).

> Le prototype inclus 3 KPIs de base (taux conformes, risques critiques, score moyen). Le délai moyen peut être ajouté via timestamps d'étapes.


