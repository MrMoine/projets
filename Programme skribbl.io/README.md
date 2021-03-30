Le but de ce petit projet en python était de voir avec quelle précision un programme qui utiliserais la souris de l'utilisateur, dans le jeu de dessin [skribbl.io](https://skribbl.io/), pourrait récréer une image donnée.
Ce programme marche pour n'importe quelle image JPG mais étant donné que skribbl.io ne propose que 4 teintes de gris différentes et que les images sont converties en noir et blanc, certaines images sont peux visibles. 

De plus dans ce jeu les images doivent être dessiné en un temps limité le programme n'aura donc pas le temps de dessiner n'importe quelle image due au limitations du jeu sur le nombre de clics par seconde. L'algorythme dessine d'abord les gros points d'une couleur avec la plus grosse brosse puis au fur et à mesure du temps ajoute des détails afin d'optimiser la qualité du dessin dans un temps réduit.

Un exemple du programme reproduisant un dessin du personnage Nauruto est le fichier `exemple.jpg` (`image.jpg` étant l'original).