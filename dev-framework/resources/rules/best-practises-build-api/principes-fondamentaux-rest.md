## Principes Fondamentaux REST

REST (Representational State Transfer) repose sur six contraintes architecturales essentielles qui garantissent la scalabilité et la flexibilité des APIs.

### Les 6 Contraintes REST

**1. Séparation Client-Serveur**

* Le client et le serveur évoluent indépendamment
* Permet une meilleure modularité et évolutivité

**2. Sans État (Stateless)**

* Chaque requête contient toutes les informations nécessaires
* Le serveur ne conserve pas de session entre les requêtes
* Simplifie considérablement l'architecture serveur et permet une scalabilité infinie

**3. Cacheable**

* Les réponses doivent indiquer si elles peuvent être mises en cache
* Utiliser les en-têtes HTTP appropriés : `Cache-Control`, `ETag`, `Last-Modified`

**4. Interface Uniforme**

* Utilisation cohérente des méthodes HTTP standard
* URLs prévisibles et conventions de nommage constantes

**5. Système en Couches**

* Architecture permettant des intermédiaires (proxies, gateways, CDN)
* Les clients ne savent pas s'ils communiquent directement avec le serveur final

**6. Code à la Demande (optionnel)**

* Le serveur peut transmettre du code exécutable au client si nécessaire

### Modèle de Maturité de Richardson

Le modèle définit 4 niveaux de maturité REST :

* **Niveau 0** : Une seule URI, toutes les opérations en POST (SOAP)
* **Niveau 1** : URIs séparées pour les ressources individuelles
* **Niveau 2** : Utilisation correcte des méthodes HTTP (GET, POST, PUT, DELETE)
* **Niveau 3** : HATEOAS (Hypermedia As The Engine Of Application State)

La plupart des APIs modernes se situent au niveau 2.

***
