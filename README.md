# KubeJS Hybrid Staff Mode, Rank & Ticketing System

## Introduction
Ce script fournit un système de modération complet pour les serveurs NeoForge 1.21.1 utilisant KubeJS. Il intègre une gestion des permissions basée sur les rangs, un "Staff Mode" sécurisé et un système de ticketing, sans nécessiter de plugins externes ou de mods d'interface supplémentaires.

---

## 1. Choix Techniques et Architecture

La conception de ce script repose sur plusieurs choix architecturaux visant à contourner les limitations du modding serveur sous NeoForge 1.21.1 afin de garantir une stabilité absolue :

* **Composants de données (Data Components) au lieu des NBT :** Suite à la suppression des tags NBT classiques sur les items en 1.21, le script utilise le composant `minecraft:custom_data` pour identifier silencieusement les outils de modération. Cela empêche les conflits avec le jeu Vanilla.
* **Interface Hybride (Inventaire + Chat) :** La création de "faux coffres" (Virtual GUIs) via KubeJS est instable et génère des désynchronisations client/serveur. Ce système utilise l'inventaire physique du joueur comme menu, et redirige les actions nécessitant une saisie vers le chat Vanilla via des messages cliquables.
* **Le déclencheur "Drop" (Jeter) :** L'API KubeJS 1.21.1 ne possédant pas d'événement natif stable pour écouter un clic précis dans le menu d'inventaire d'un joueur, le script intercepte la touche "Jeter" (A ou Q par défaut). Lorsqu'un modérateur tente de jeter un outil depuis son inventaire, l'action est annulée, l'inventaire se ferme automatiquement, et la commande associée s'exécute.

## 2. Limites Connues

En raison de la nature des mods (contrairement aux plugins type PaperMC), certaines limites techniques inhérentes au moteur du jeu existent :

* **Saisie des Commandes :** Le serveur ne peut pas forcer l'ouverture du chat (touche T) du client avec un texte pré-rempli pour des raisons de sécurité imposées par Mojang. Le script contourne cela en envoyant un texte cliquable dans le chat qui, une fois cliqué par le modérateur, ouvre la barre de saisie et prépare la commande.

## 3. Fonctionnalités Principales

* **Role-Based Access Control (RBAC) :** Système de rangs hiérarchisés (`joueur`, `modo`, `admin`, `fondateur`). Les permissions sont héritées : un rang supérieur a accès aux commandes des rangs inférieurs.
* **Système de Ticketing (Bug Tracker) :** Les joueurs peuvent signaler des problèmes en jeu. Le staff est notifié en temps réel (alerte sonore et visuelle) et peut gérer les tickets en attente via une interface interactive dans le chat.
* **Staff Mode Sécurisé :** L'activation sauvegarde complètement l'état du joueur. À la désactivation, l'inventaire, le mode de jeu, les points de vie et la faim sont restaurés à leur état exact.
* **Protection et Anti-Grief :** Un modérateur en service devient invincible (immunisé aux dégâts et à la commande forcée `/kill`) et ne peut ni casser ni poser de blocs (à l'exception de l'utilisation de la hache en bois pour les sélections WorldEdit).
* **Aspirateur Anti-Pollution :** Tout item Vanilla jeté au sol par un modérateur en observation est instantanément détruit pour éviter de polluer la carte. Les outils de modération jetés par erreur sont bloqués et retournent automatiquement dans l'inventaire.
* **Mode Construction :** Permet au modérateur de désactiver temporairement son Anti-Grief pour construire ou réparer une zone. L'inventaire de modération est masqué et remplacé par un unique bouton de sortie pour éviter toute erreur de modération pendant la construction.
* **Mode Fantôme / Solide :** Un outil dédié permet de basculer à la volée entre le mode Spectateur (intangible, passe-murailles) et le mode Créatif (tangible avec collisions activées).

## 4. Utilisation et Commandes

### Commandes de Rangs
* `/rank set <joueur> <rang>` : Modifie le rang d'un joueur.
* `/rank info` : Affiche votre rang actuel.
* `/rank claim` : Permet à un opérateur (niveau 4 Vanilla) de réclamer le rang `fondateur` en cas de perte de permission.

### Commandes de Ticketing
* `/report <problème>` : Enregistre un nouveau ticket. Accessible à tous les joueurs.
* `/reports` : Affiche le menu interactif des tickets en attente pour les modérateurs. Un bouton "TRAITER" permet de résoudre et supprimer le ticket de la base de données d'un simple clic.

### Commandes de Modération
L'utilisation de la commande `/modstaff` active le mode de service et remplace l'inventaire par les outils suivants :

**Dans la barre d'action (Utilisation par Clic Droit) :**
* **Téléportation (Ender Pearl) :** Prépare la commande `/modtp`.
* **Geler (Bâton de Blaze) :** Prépare la commande `/modfreeze` pour immobiliser un joueur.
* **Mute (Ficelle) :** Prépare la commande `/modmute` pour bloquer l'accès au chat public et privé.
* **Bascules d'état :** Mode Solide/Fantôme (Plume/Membrane) et Mode Construction (Briques).

**Dans l'inventaire supérieur (Utilisation par la touche Jeter "A" ou "Q") :**
* **Avertir (Torche de Redstone) :** Prépare la commande `/modwarn` avec journalisation JSON.
* **Bannir (TNT) :** Prépare la commande `/modban`.
* **Soigner (Pomme Dorée) :** Exécute directement `/modheal` sur le modérateur.
* **Nettoyer (Éponge) :** Prépare la commande `/modclear` pour vider l'inventaire d'un joueur.

### Commandes Manuelles Additionnelles
* `/modunmute <joueur>` : Rend la parole à un joueur.
* `/modunfreeze <joueur>` : Dégèle un joueur et l'autorise à se déplacer.
* `/modwarns <joueur>` : Affiche l'historique des avertissements d'un joueur.
* `/modunwarn <joueur> <id/all>` : Supprime un avertissement spécifique ou la totalité du passif d'un joueur.
* `/modkick <joueur> [raison]` : Expulse un joueur du serveur.
* `/modunban <joueur>` : Débannit un joueur.
* `/modgm <joueur> <survival/creative/spectator/adventure>` : Change le mode de jeu ciblé d'un joueur.
* `/broadcast <message>` : Envoie une annonce globale dorée à tout le serveur.
* `/a <message>` : Envoie un message dans le canal de discussion privé réservé aux administrateurs.
