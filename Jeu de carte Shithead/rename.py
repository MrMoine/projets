from os import rename, listdir

fnames = listdir('./Client/images')

for fname in fnames:
	valeur = fname[:fname.index("_")]
	couleur = fname[fname.index("_") + 1:fname.index(".")]
	rename("./Client/images/" + fname, "./Client/images/" + couleur + "_" + valeur + ".png")
print("Done")