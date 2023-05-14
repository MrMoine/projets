Le but de ce petit projet en python était de voir avec quelle précision un programme qui utiliserait la souris de l'utilisateur, dans le jeu de dessin skribbl.io, pourrait récréer une image donnée.
Ce programme marche pour n'importe quelle image JPG mais étant donné que skribbl.io ne propose que 4 teintes de gris différentes et que les images sont converties en noir et blanc, certaines images sont peu visibles.

De plus dans ce jeu les images doivent être dessinées en un temps limité. Le programme n'aura donc pas le temps de dessiner n'importe quelle image due aux limitations du jeu sur le nombre de clics par seconde. 
L'algorithme dessine d'abord les gros points d'une couleur avec la plus grosse brosse puis au fur et à mesure du temps ajoute des détails afin d'optimiser la qualité du dessin dans un temps réduit. 

Un exemple du programme reproduisant un dessin du personnage Nauruto est le fichier `exemple.jpg` (`image.jpg` étant l'original).
