---
name: playbook-builder
description: >
  Genere un playbook complet et actionnable sur N'IMPORTE QUEL sujet a partir
  d'un prompt simple. Recherche web exhaustive, auto-feedback via 10 angles
  de challenger, approfondissement iteratif. Produit un document structure
  pret a executer, stocke dans le context store.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch
model: opus
user-invocable: true
disable-model-invocation: false
---

# Playbook Builder

## Objectif

A partir d'un prompt simple (ex: "genere un playbook pour faire du SEO"), produire un playbook complet, concret et actionnable. Le playbook doit couvrir tous les angles necessaires pour qu'une personne puisse executer le sujet de A a Z sans connaissance prealable.

Le skill utilise un process de **meta-prompting** : apres chaque phase de recherche et redaction, un systeme d'auto-feedback (les "10 angles du challenger") identifie les lacunes et declenche des recherches complementaires.

## Prerequis

- Un prompt utilisateur decrivant le sujet du playbook
- Optionnel : un contexte projet (ref dans le context store) auquel rattacher le playbook

## Process

### Phase 1 — Cadrage (pas de recherche encore)

Avant toute recherche, analyser le prompt pour extraire :

1. **Le sujet** — de quoi parle-t-on exactement ?
2. **L'objectif implicite** — pourquoi l'utilisateur veut ce playbook ? (gagner de l'argent, apprendre, deployer, etc.)
3. **Le niveau de depart** — l'utilisateur est debutant, intermediaire ou expert ?
4. **Le scope** — est-ce un playbook general ou applique a un cas precis ?

Formuler en 1 phrase : "Ce playbook doit permettre a [qui] de [faire quoi] en partant de [quel niveau] pour atteindre [quel resultat]."

**Checkpoint utilisateur** : Presenter cette phrase et demander validation/ajustement avant de continuer.

### Phase 2 — Recherche initiale (les fondamentaux)

Lancer 3-5 recherches web en parallele pour couvrir les bases du sujet :

- Source officielle / autorite (#1 du domaine)
- Guide pratique reconnu (blog de reference)
- Tutoriel/strategie avancee
- Cas d'etude ou retour d'experience

Pour chaque source, utiliser WebFetch avec un prompt d'extraction exhaustif.

**Objectif** : avoir assez de matiere pour rediger un premier draft couvrant les fondamentaux.

### Phase 3 — Premier draft (Angle 1 : Comprendre)

Rediger les parties fondamentales du playbook :

- Comment ca marche (mecanismes, principes)
- Ce qu'il faut faire (bonnes pratiques)
- Ce qu'il ne faut PAS faire (erreurs, interdits)
- Les outils necessaires
- Les metriques de succes

Ce premier draft est volontairement incomplet. C'est le point de depart pour le challenger.

### Phase 4 — Auto-feedback (les 10 angles du challenger)

C'est le coeur du skill. Apres le premier draft, passer systematiquement chaque angle et evaluer : "est-ce que mon playbook repond a cette question ? Si non, je dois rechercher et enrichir."

#### Les 10 angles universels

**Angle 1 — COMPRENDRE** (deja couvert en Phase 3)
> Comment ca marche fondamentalement ? Quels sont les mecanismes ? Les regles du jeu ?
- Si le draft couvre ca : passer
- Sinon : rechercher les fondamentaux

**Angle 2 — CADRER**
> Quel est l'objectif final concret ? C'est quoi le succes ? En combien de temps ? Avec quel budget ?
- Questions de recherche : "combien de temps pour [sujet]", "budget realiste [sujet]", "objectifs [sujet] debutant"
- Output : timeline realiste, budget, KPIs cibles

**Angle 3 — OPERATIONNALISER**
> Concretement, je fais quoi jour 1, semaine 1, mois 1 ? Quel est le process repetable ?
- Questions de recherche : "[sujet] step by step", "[sujet] daily routine", "[sujet] workflow process"
- Output : calendrier d'actions (jour/semaine/mois), routines, checklists

**Angle 4 — ALIMENTER**
> D'ou viennent les inputs ? Quelles sources de donnees ? Quel contenu de base ? Quelles matieres premieres ?
- Questions de recherche : "[sujet] data sources", "[sujet] where to find", "[sujet] raw materials inputs"
- Output : liste de sources, APIs, flux de donnees, fournisseurs

**Angle 5 — DEMULTIPLIER**
> Comment transformer 1 effort en 10 resultats ? Repurposing, declinaisons, automation, economies d'echelle ?
- Questions de recherche : "[sujet] scale", "[sujet] repurpose", "[sujet] automation", "[sujet] multiply results"
- Output : strategies de demultiplication, templates reutilisables, automations

**Angle 6 — CONTRAINDRE**
> Quelles sont les limites ? Qu'est-ce qui est trop ? Trop vite ? Les seuils concrets ? Les echecs connus ?
- Questions de recherche : "[sujet] limits", "[sujet] too much", "[sujet] failure case study", "[sujet] penalty"
- Output : seuils chiffres, protocoles de securite, cas d'echec documentes

**Angle 7 — MESURER**
> Quels KPIs suivre ? Comment savoir si ca marche ? Quand pivoter ? Quelles metriques sont du vanity ?
- Questions de recherche : "[sujet] KPIs metrics", "[sujet] how to measure success", "[sujet] analytics"
- Output : tableau de KPIs, outils de mesure, seuils de succes/echec

**Angle 8 — COMPARER**
> Qui fait ca bien ? Qui a echoue ? Qu'est-ce qui differencie les deux ? Quels benchmarks ?
- Questions de recherche : "[sujet] case study success", "[sujet] best examples", "[sujet] failure post-mortem"
- Output : cas de succes et d'echec avec analyse, benchmarks

**Angle 9 — OUTILLER**
> Quels outils, stack, automatisations ? Gratuit vs payant ? Quel est le setup minimal ?
- Questions de recherche : "[sujet] best tools 2026", "[sujet] free tools", "[sujet] tech stack"
- Output : tableau d'outils avec cout, usage, alternatives

**Angle 10 — DEFENDRE**
> Quels risques (legaux, techniques, business, reputation) ? Comment les mitiger ?
- Questions de recherche : "[sujet] risks", "[sujet] legal compliance", "[sujet] what can go wrong"
- Output : matrice de risques avec severite et mitigation

### Phase 5 — Recherche complementaire

Pour chaque angle identifie comme manquant en Phase 4 :

1. Lancer 2-3 recherches web ciblees (WebSearch + WebFetch)
2. Extraire les informations pertinentes avec citations de sources
3. Rediger la partie correspondante du playbook

**Paralleliser** : lancer les recherches pour 2-3 angles en meme temps quand possible.

### Phase 6 — Assemblage final

Assembler toutes les parties dans un document structure :

```
## Partie 1 — [Comprendre] : Les fondamentaux
## Partie 2 — [Cadrer] : Objectifs, timeline, budget
## Partie 3 — [Operationnaliser] : Le process concret (jour/semaine/mois)
## Partie 4 — [Alimenter] : Sources de donnees et inputs
## Partie 5 — [Demultiplier] : Scaling et automation
## Partie 6 — [Contraindre] : Limites et seuils de securite
## Partie 7 — [Mesurer] : KPIs et metriques
## Partie 8 — [Comparer] : Cas de succes et d'echec
## Partie 9 — [Outiller] : Stack et outils recommandes
## Partie 10 — [Defendre] : Risques et mitigation
## Resume en une phrase
```

L'ordre peut varier selon le sujet. Certains angles peuvent etre fusionnes si le contenu est court. Les parties les plus pertinentes pour le sujet doivent etre les plus detaillees.

### Phase 7 — Stockage dans le context store

1. Sauvegarder le playbook dans `context/store/playbook-{sujet}.md` avec le frontmatter :

```yaml
---
id: playbook-{sujet}
type: permanent/strategy
created: {date}
updated: {date}
status: active
refs: [{refs pertinentes}]
scope: global
---
```

2. Ajouter l'entree dans `context/registry.json` (entities + graph)

3. Informer l'utilisateur du fichier cree et presenter un resume du playbook.

## Regles de qualite

- **Sources obligatoires** : chaque affirmation chiffree doit venir d'une source web identifiable
- **Donnees concretes** : pas de "beaucoup", "souvent", "il faut". Des chiffres, des seuils, des exemples
- **Actionnable** : chaque partie doit contenir des actions concretes, pas juste de la theorie
- **Checklists** : utiliser des `- [ ]` pour les actions a effectuer
- **Tableaux** : privilegier les tableaux pour les comparaisons, listes d'outils, seuils
- **Cas reels** : au moins 2-3 cas d'etude (succes ET echec) dans le playbook
- **Pas de bullshit** : si une info n'est pas trouvee ou fiable, le dire explicitement plutot que d'inventer

## Regles de recherche

- Minimum 8-12 sources web consultees au total
- Privilegier : sources officielles > blogs de reference > forums
- Pour chaque WebFetch, ecrire un prompt d'extraction exhaustif (pas "resume cette page")
- Lancer les recherches en parallele quand les angles sont independants
- Si une source retourne une erreur 404/403, chercher une alternative immediatement

## Output

- **Fichier principal** : `context/store/playbook-{sujet}.md`
- **Registry** : entree ajoutee dans `context/registry.json`
- **Resume** : presente a l'utilisateur en fin de process

## Adaptation au contexte

Si l'utilisateur mentionne un projet existant dans le context store :
- Lire la fiche projet pour comprendre le contexte
- Adapter les recherches et exemples au domaine du projet
- Ajouter le projet dans les refs du playbook
