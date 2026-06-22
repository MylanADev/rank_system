# KubeJS Hybrid Staff Mode & Rank System

## Introduction
Ce script fournit un système de modération complet pour les serveurs NeoForge 1.21.1 utilisant KubeJS. Il intègre une gestion des permissions basée sur les rangs et un "Staff Mode" sécurisé, sans nécessiter de plugins externes ou de mods d'interface supplémentaires.

---

## 1. Choix Techniques et Architecture

La conception de ce script repose sur plusieurs choix architecturaux visant à contourner les limitations du modding serveur sous NeoForge 1.21.1 afin de garantir une stabilité absolue :

*   **Composants de données (Data Components) au lieu des NBT :** Suite à la suppression des tags NBT classiques sur les items en 1.21, le script utilise le composant `minecraft:custom_data` pour identifier silencieusement les outils de modération[cite: 4]. Cela empêche les conflits avec le jeu Vanilla.
*   **Interface Hybride (Inventaire + Chat) :** La création de "faux coffres" (Virtual GUIs) via KubeJS est instable et génère des désynchronisations client/serveur. Ce système utilise l'inventaire physique du joueur comme menu, et redirige les actions nécessitant une saisie vers le chat Vanilla via des messages cliquables[cite: 4].
*   **Le déclencheur "Drop" (Jeter) :** L'API KubeJS 1.21.1 ne possédant pas d'événement natif stable pour écouter un clic précis dans le menu d'inventaire d'un joueur, le script intercepte la touche "Jeter" (A ou Q par défaut)[cite: 4]. Lorsqu'un modérateur tente de jeter un outil depuis son inventaire, l'action est annulée, l'inventaire se ferme automatiquement, et la commande associée s'exécute[cite: 4].

## 2. Limites Connues

En raison de la nature des mods (contrairement aux plugins type PaperMC), certaines limites techniques inhérentes au moteur du jeu existent :

*   **Vanish et Menu TAB :** L'invisibilité appliquée par ce script rend le joueur invisible dans le monde physique (effet de potion et particules masquées), mais ne supprime pas le pseudo du joueur de la liste de joueurs connectés (TAB). Pour une invisibilité réseau totale, un mod serveur dédié (comme Vanishmod) reste nécessaire.
*   **Saisie des Commandes :** Le serveur ne peut pas forcer l'ouverture du chat (touche T) du client avec un texte pré-rempli pour des raisons de sécurité imposées par Mojang. Le script contourne cela en envoyant un texte cliquable dans le chat qui, une fois cliqué par le modérateur, ouvre la barre de saisie et prépare la commande[cite: 4].

## 3. Fonctionnalités Principales

*   **Role-Based Access Control (RBAC) :** Système de rangs hiérarchisés (`joueur`, `modo`, `admin`, `fondateur`)[cite: 4]. Les permissions sont héritées : un rang supérieur a accès aux commandes des rangs inférieurs[cite: 4].
*   **Staff Mode Sécurisé :** L'activation sauvegarde complètement l'état du joueur. À la désactivation, l'inventaire, le mode de jeu, les points de vie et la faim sont restaurés à leur état exact[cite: 4].
*   **Protection et Anti-Grief :** Un modérateur en service devient invincible (immunisé aux dégâts et à la commande forcée `/kill`) et ne peut ni casser ni poser de blocs (à l'exception de l'utilisation de la hache en bois pour les sélections WorldEdit)[cite: 4].
*   **Aspirateur Anti-Pollution :** Tout item Vanilla jeté au sol par un modérateur en observation est instantanément détruit pour éviter de polluer la carte[cite: 4]. Les outils de modération jetés par erreur sont bloqués et retournent automatiquement dans l'inventaire[cite: 4].
*   **Mode Construction :** Permet au modérateur de désactiver temporairement son Anti-Grief pour construire ou réparer une zone. L'inventaire de modération est masqué et remplacé par un unique bouton de sortie pour éviter toute erreur de modération pendant la construction[cite: 4].
*   **Mode Fantôme / Solide :** Un outil dédié permet de basculer à la volée entre le mode Spectateur (intangible, passe-murailles) et le mode Créatif (tangible avec collisions activées)[cite: 4].

## 4. Utilisation et Commandes

### Commandes de Rangs
*   `/rank set <joueur> <rang>` : Modifie le rang d'un joueur[cite: 4].
*   `/rank info` : Affiche votre rang actuel[cite: 4].
*   `/rank claim` : Permet à un opérateur (niveau 4 Vanilla) de réclamer le rang `fondateur` en cas de perte de permission[cite: 4].

### Commandes de Modération
L'utilisation de la commande `/modstaff` active le mode de service et remplace l'inventaire par les outils suivants[cite: 4] :

**Dans la barre d'action (Utilisation par Clic Droit) :**
*   **Téléportation (Ender Pearl) :** Prépare la commande `/modtp`[cite: 4].
*   **Inspecter (Longue-vue) :** Prépare la commande `/modinvsee` pour voir et modifier l'inventaire complet d'un joueur interactivement[cite: 4].
*   **Geler (Bâton de Blaze) :** Prépare la commande `/modfreeze` pour immobiliser un joueur[cite: 4].
*   **Mute (Ficelle) :** Prépare la commande `/modmute` pour bloquer l'accès au chat[cite: 4].
*   **Bascules d'état :** Mode Solide/Fantôme (Plume/Membrane), Mode Construction (Briques), Vanish (Sucre/Poudre)[cite: 4].

**Dans l'inventaire supérieur (Utilisation par la touche Jeter "A" ou "Q") :**
*   **Avertir (Torche de Redstone) :** Prépare la commande `/modwarn` avec journalisation JSON[cite: 4].
*   **Bannir (TNT) :** Prépare la commande `/modban`[cite: 4].
*   **Soigner (Pomme Dorée) :** Exécute directement `/modheal` sur le modérateur[cite: 4].
*   **Nettoyer (Éponge) :** Exécute directement `/modclear`[cite: 4].

### Commandes Manuelles Additionnelles
*   `/modunmute <joueur>` : Rend la parole à un joueur[cite: 4].
*   `/modunfreeze <joueur>` : Dégèle un joueur et l'autorise à se déplacer[cite: 4].
*   `/modwarns <joueur>` : Affiche l'historique des avertissements d'un joueur[cite: 4].
*   `/modunwarn <joueur> <id/all>` : Supprime un avertissement spécifique ou la totalité du passif d'un joueur[cite: 4].
*   `/modkick <joueur> [raison]` : Expulse un joueur du serveur[cite: 4].
*   `/modunban <joueur>` : Débannit un joueur[cite: 4].
*   `/modgm <joueur> <survival/creative/spectator/adventure>` : Change le mode de jeu ciblé d'un joueur[cite: 4].
*   `/broadcast <message>` : Envoie une annonce globale dorée à tout le serveur[cite: 4].
*   `/a <message>` : Envoie un message dans le canal de discussion privé réservé aux administrateurs[cite: 4].
