export const autonomousChapters=['Démarrer et comparer','Écrire avec méthode','Chercher et analyser','Créer son marketing','Produire des supports','Organiser et automatiser','Construire son système'];
export const autonomousTitles=[
'Votre premier test équitable','Un prompt qui se vérifie','Contexte et confidentialité','Corriger sans tout refaire',
'Votre voix de marque','Courriels et relances','Résumer une réunion','Simuler un échange difficile',
'Recherche et sources','Lire un document','Comparer des dossiers','Analyser un tableau',
'Positionnement et audience','Description immobilière','Calendrier de contenu','Infolettre et segmentation',
'Brief visuel et image','Scénario et storyboard','Présentation commerciale','Prototype et code',
'Projets et base de connaissances','Assistant réutilisable','Connecteurs et permissions','Automatisation contrôlée',
'Veille et mesure','Votre bibliothèque de prompts','Choisir selon les preuves','Défi final : campagne complète'];
export const autonomousCatalog=autonomousTitles.map((title,i)=>({id:`auto-${String(i+1).padStart(2,'0')}`,title,day:i+1,chapter:autonomousChapters[Math.floor(i/4)],minutes:i===27?60:25}));
