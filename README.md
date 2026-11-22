# THE PAIN MD — Frontend

## Frontend
Le site est un frontend statique destiné à Vercel.

Fichiers principaux :
- index.html
- session.html
- qr.html
- pair.html
- deploy.html
- support.html
- files.html
- help.html
- about.html
- style.css
- script.js
- session-api.js
- qr.js
- pair.js
- vercel.json

## API backend

Toutes les routes utilisent le préfixe /api/v1.

### Créer une session

POST /api/v1/sessions

QR :
{ "method": "qr" }

Pairing :
{ "method": "pair" }

### Lire la session courante

GET /api/v1/sessions/current

### Actualiser le QR

POST /api/v1/sessions/current/qr/refresh

### Générer un Pairing Code

POST /api/v1/sessions/current/pairing-code

{ "phone": "243XXXXXXXXX" }

### Déconnexion volontaire

POST /api/v1/sessions/current/logout

## Règles de session

- Fermer le site ne déconnecte pas le bot.
- Fermer le navigateur ne déconnecte pas le bot.
- Mettre le téléphone hors ligne ne déconnecte pas le bot.
- Une coupure réseau temporaire déclenche une reconnexion.
- Un redémarrage du serveur restaure les sessions depuis PostgreSQL.
- Une session active ne possède pas de TTL arbitraire de 30 jours.
- Un logout volontaire supprime les données d'authentification.
- Une révocation définitive par WhatsApp met fin à la session.

## Sécurité

- Aucun identifiant WhatsApp dans le navigateur.
- Cookie HttpOnly sécurisé pour reconnaître le propriétaire.
- Authentification Baileys stockée côté serveur.
- Secrets uniquement dans les variables d'environnement du backend.
- Limitation des requêtes de création de session et de Pairing Code.

Le frontend seul ne crée pas encore de session WhatsApp.
Les routes API doivent être implémentées côté backend.
