# Comment utiliser l'Index

## Principe

L'index est une mémoire long-terme organisée en fichiers markdown.

**`index.md`** = Sommaire général avec liens vers les différentes sections.

Chaque section a son propre fichier `.md` dans le dossier `index/`.

## Structure

```
index/
├── README.md              (ce fichier - guide d'utilisation)
├── index.md               (sommaire principal avec liens)
├── personal-context.md    (profil personnel)
├── stack-technique.md     (stack & compétences)
├── workflow.md            (workflow de développement)
└── objectives.md          (objectifs court/long terme)
```

## Navigation

1. Lire `index.md` pour avoir la vue d'ensemble
2. Suivre les liens vers les sections spécifiques
3. L'agent peut créer de nouveaux fichiers au besoin

## Maintenance

- L'agent met à jour les fichiers selon les besoins
- Date de dernière mise à jour en bas de chaque fichier
- Garder `index.md` synchronisé avec les nouveaux fichiers
