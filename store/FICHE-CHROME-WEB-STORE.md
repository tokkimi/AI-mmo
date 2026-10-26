# i-Courtier — Publication sur le Chrome Web Store

Tout ce qu'il faut pour publier i-Courtier, à copier-coller dans la console développeur :
https://chrome.google.com/webstore/devconsole

## Fichiers à téléverser (dossier `store/`)

| Élément | Fichier | Où |
|---|---|---|
| Extension | `i-courtier-chrome-web-store.zip` | « Nouvel élément » → téléverser |
| Icône du Store (128×128) | `icone-128.png` | Fiche → Ressources graphiques |
| Captures d'écran (1280×800) | `capture-1` à `capture-5` | Fiche → Captures d'écran (dans l'ordre) |
| Petite tuile promotionnelle (440×280) | `tuile-promo-440x280.png` | Fiche → Tuile promotionnelle |
| Bannière (1400×560), facultative | `banniere-1400x560.png` | Fiche → Bannière |

## Onglet « Fiche Play Store »

**Nom** (repris du fichier) : i-Courtier — L’IA pour vos pratiques immo

**Résumé** (repris du fichier) : Agent IA pour courtiers immobiliers du Québec : saisie à la source, documents, contrats, inscriptions et rédaction.

**Description**

```
i-Courtier est l’assistant IA des courtiers immobiliers du Québec, par i-ateliers. Il s’ouvre à côté de vos pages, dans votre navigateur, et prend en charge l’administratif de vos dossiers.

UN AGENT QUI AGIT
Demandez en langage courant : « la promesse est acceptée, ajoute les échéances », « coche l’acte de vente », « prépare la contre-proposition ». L’agent répond et met à jour le dossier : fiche, documents, tâches, statut, formulaires et ébauches.

SAISIE À LA SOURCE
Capturez une page, un courriel du vendeur ou importez un PDF : la fiche d’inscription se remplit (32 champs) et ce qui manque ou se contredit est signalé.

REMPLISSAGE DE FORMULAIRES
Sur votre système d’inscription, votre CRM ou un portail, un clic remplit les champs reconnus et les surligne pour vérification.

DOCUMENTS GUIDÉS
Registre foncier (index des immeubles, acte de vente, hypothèque, transmission), rôle d’évaluation et taxes municipales, taxes scolaires, estimation Hydro-Québec : le bon site, le n° de lot copié, les étapes, puis la lecture du PDF.

ÉBAUCHES ET RÉDACTION
Contrat de courtage, promesse d’achat, contre-proposition, modifications, déclarations du vendeur. Courriels au vendeur, à l’acheteur, au notaire, suivis de visite, publications et textos, signés à votre nom.

ANALYSE ET OUTILS
Analyse d’inspection, de déclarations ou de procès-verbaux (points d’alerte, questions à poser), tâches et échéances, mensualité hypothécaire, commission avec TPS et TVQ, répartition des taxes, sauvegarde des dossiers.

VOUS GARDEZ LA MAIN
Rien n’est signé, publié ou envoyé automatiquement. Les formulaires obligatoires de l’OACIQ prévalent toujours. Vos dossiers restent dans votre navigateur.

Abonnement requis : 250 CAD par mois + taxes, sans frais fixes, sur https://i-ateliers.ca/i-courtier
```

**Catégorie** : Productivité → Outils (ou « Flux de travail et planification »)
**Langue** : Français (Canada)
**Site Web officiel** : https://i-ateliers.ca/i-courtier
**URL d'assistance** : https://i-ateliers.ca/i-courtier/installer

## Onglet « Pratiques de confidentialité »

**Objectif unique**

```
Aider les courtiers immobiliers à préparer leurs dossiers : extraire les données d’une propriété à partir des pages, PDF et notes fournis par le courtier, remplir ses formulaires, et rédiger ses documents et communications.
```

**Justification des autorisations**

| Autorisation | Justification à coller |
|---|---|
| sidePanel | L’outil s’affiche dans le panneau latéral, à côté de la page de travail du courtier. |
| storage | Les dossiers, le profil du courtier et la session sont enregistrés localement dans le navigateur. |
| scripting | À la demande du courtier, lire le texte de l’onglet actif et remplir les champs du formulaire affiché. |
| activeTab | Agir uniquement sur l’onglet que le courtier utilise au moment où il clique sur une action. |
| contextMenus | Menu « Envoyer la sélection à i-Courtier » pour ajouter un texte sélectionné au dossier. |
| Autorisations d'hôte (toutes les URL) | Les courtiers travaillent sur de nombreux sites (systèmes d’inscription, CRM, registre foncier, municipalités, Hydro-Québec). L’extension lit ou remplit une page seulement quand le courtier clique sur une action. Sur i-ateliers.ca, elle indique sa version à la page d’installation. |

**Code distant** : Non, je n'utilise pas de code distant.

**Utilisation des données** : cocher

- Informations permettant d'identifier personnellement l'utilisateur (courriel et nom du compte)
- Informations d'authentification (mot de passe à la connexion, jeton de session)
- Contenu du site Web (texte ou capture de la page, seulement quand le courtier lance une action)

Puis cocher les trois certifications :

- Je ne vends ni ne transfère les données des utilisateurs à des tiers, en dehors des cas d'utilisation approuvés.
- Je n'utilise ni ne transfère les données des utilisateurs à des fins sans rapport avec l'objectif unique de mon article.
- Je n'utilise ni ne transfère les données des utilisateurs pour déterminer leur solvabilité ou à des fins de prêt.

**Règles de confidentialité (URL)** : https://i-ateliers.ca/i-courtier/confidentialite

## Onglet « Distribution »

- **Paiement** : Gratuit. L'abonnement se paie sur i-ateliers.ca.
- **Visibilité** : Public (recommandé pour être trouvé) ou Non répertorié (installable uniquement avec le lien).
- **Régions** : Canada, ou toutes les régions.

## Accès pour l'équipe d'examen de Google

L'extension demande une connexion : Google exige un compte de test.

1. Créez un compte sur https://i-ateliers.ca/?view=register avec une adresse dédiée (par exemple une adresse secondaire d'i-ateliers).
2. Donnez-nous cette adresse pour l'ajouter à l'accès gratuit.
3. Dans l'onglet « Accès de test » (ou « Instructions de test »), collez :

```
Connectez-vous dans le panneau i-Courtier avec le courriel et le mot de passe ci-dessous. Ouvrez ensuite n’importe quelle page web, onglet Saisie → « Capturer la page » → « Extraire la fiche », puis onglet Agent pour poser une question.
Courriel : [à compléter]
Mot de passe : [à compléter]
```

## Après l'approbation

Envoyez-nous l'adresse de la fiche (https://chromewebstore.google.com/detail/…) : nous l'activons sur le site, et la page d'installation devient un simple bouton « Ajouter à Chrome ». Les mises à jour suivantes se font en téléversant le nouveau fichier dans la console : les courtiers les reçoivent automatiquement.
