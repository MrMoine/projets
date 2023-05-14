# À propos de ce projet

Le but de ce projet était de voir s'il était possible de streamer de l'audio en temps réel à un service de reconnaissance vocale sur Internet. Après quelques recherches, j'ai vu qu'apparemment cela avait déjà été fait, mais personne ne l'avait réellement documenté, j'ai donc décidé d'essayer par moi-même. J'ai du apprendre beaucoup de choses sur le fonctionnement de l'audio digitale, les protocoles internet et FreeRTOS afin de réussir ce projet. Le but final du projet était de réussir à allumer une LED par commande vocale comme "proof of concept" de l'idée.

# Rôle des fichiers
  Les fichiers `main.ino`,`utils.cpp` et `utils.h` sont des fichiers du code de l'esp32.

  Le fichiers `server.js` à servis à recevoir l'audio envoyé par l'esp pour des tests, le fichier `test.raw` est le résultat d'un de ces test, il peut être importé dans un logiciel audio tel qu'Audacity en tant que données brutes de 8 bit PCM, "petit-boutistes" avec un taux d'échantillonage de 50KHz.

  Le fichier `test_client.py` à servis à faire les premier tests d'envoi d'audio à wit.ai, le fichier `test_ssl_sock.py` sert le même but mais en imitant de plus près ce qu'il se passe sur la carte avec des librairie python aussi bas niveau que celle à ma disposition sur l'esp32.

  Enfin le fichier `visualisation.py` sert comme son nom l'indique à visualiser l'audio sans avoir à l'ouvrir dans Audacity.
