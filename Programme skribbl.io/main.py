import pyautogui
from pynput.keyboard import Key, Listener
import cv2
import numpy as np
import matplotlib.pyplot as plt
import pybresenham

pyautogui.PAUSE = 0.0005

ABS_POS_CANVAS = (472,220)
CANVAS_SIZE = (836, 627)

actions = {
	"noir": [
		[], [], [], []
	],
	"gris foncé": [
		[], [], [], []
	],
	"gris clair": [
		[], [], [], []
	],
	"blanc": [
		[], [], [], []
	]
}

def canvasCordToAbsCord(x, y):
	return (x + ABS_POS_CANVAS[0] , y + ABS_POS_CANVAS[1])

def rgbToGrayscale(r, g, b):
	return int(0.21 * r + 0.72 * g+ 0.07 * b)

def getColor(valeurNoir):
	if valeurNoir == -1:
		return "none"
	if valeurNoir < 76:
		return "noir"
	elif valeurNoir < 193:
		return "gris foncé"
	elif valeurNoir < 250:
		return "gris clair"
	else:
		return "blanc"


def selectBrush(brushNb):
	if brushNb == 0:
		pyautogui.click(x=1034, y=878)
	elif brushNb == 1:
		pyautogui.click(x=1085, y=878)
	elif brushNb == 2:
		pyautogui.click(x=1135, y=878)
	else:
		pyautogui.click(x=1192, y=878)

def selectColor(couleur):
	if couleur == "noir":
		pyautogui.click(x=585, y=891)  # brosse noire
	elif couleur == "gris foncé":
		pyautogui.click(x=612, y=894)  # brosse grise foncée
	elif couleur == "gris clair":
		pyautogui.click(x=608, y=867)  # brosse grise claire
	elif couleur == "blanc":
		pyautogui.click(x=584, y=867)  # brosse blanche
	else:
		raise RuntimeError("Aucune couleur connue trouvée")

def coloredImageToGray(image):
	imageToReturn = []
	for x in range(len(image)):
		ligne = []
		for y in range(len(image[x])):
			grayScale = rgbToGrayscale(image[x][y][0], image[x][y][1], image[x][y][2])
			ligne.append(grayScale)
		imageToReturn.append(ligne)
	return np.array(imageToReturn)

def onPress(key):
	if key == Key.ctrl_r:
		for brushNb in range(3,-1,-1):
			selectBrush(brushNb)
			for color in actions:
				selectColor(color)
				for coord in actions[color][brushNb]:
					absCoord = canvasCordToAbsCord(coord[1]*2, coord[0]*2)#  
					pyautogui.click(x=absCoord[0], y=absCoord[1])


	if key == Key.esc:
		exit()


listener = Listener(on_press=onPress)
listener.start()

#processing des données
original = cv2.imread("./image.jpg", 1)
img = cv2.resize(original, (CANVAS_SIZE[0] // 2, CANVAS_SIZE[1] // 2), interpolation=cv2.INTER_AREA)#la précision max qu'on peut avoir
img = coloredImageToGray(img)

img2 = {"noir": np.copy(img),
        "blanc": np.copy(img),
        "gris clair": np.copy(img),
        "gris foncé": np.copy(img)
		}
for brosse in range(3, -1, -1):
	rayon = 0
	if brosse == 0:
		rayon = 0
	if brosse == 1:
		rayon = 2
	if brosse == 2:
		rayon = 4
	if brosse == 3:
		rayon = 9
	for colorNb in range(3):#INFO: on skip le blanc (le fond est blanc)
		color = ""
		if colorNb == 0:
			color = "noir"
		if colorNb == 1:
			color = "gris foncé"
		if colorNb == 2:
			color = "gris clair"
		if colorNb == 3:
			color = "blanc"

		toAddAtTheEnd = []
		for x in range(len(img2[color])):
			for y in range(len(img2[color][x])):
				if getColor(img2[color][x][y]) == color:
					#on cherche si tous les pixels dans un rayon défini sont noir
					pointsDisque = []

					for i in range(rayon, 0, -1):  #on part du cercle extérieur et on rétrécis, comme ça on a le disque
						a = list(set(pybresenham.circle(x, y, i)))
						pointsDisque += a
					#normalement pointsDisque contient tous les points autour du point (x;y) dans un rayon de "rayon"
					for pos in pointsDisque:
						if pos[0] < 0 or pos[0] >= img2[color].shape[0] or pos[1] < 0 or pos[1] >= img2[color].shape[1]:
							continue
						if getColor(img2[color][pos[0]][pos[1]]) != color:
							break
					else:#si tous les points du disque autour du point sont noirs
						actions[color][brosse].append((x, y))  #on dessineras ces points avec la brosse
						#on marque le centre comme étant pas noir = il faut pas repasser dessus
						img2[color][x][y] = -1
						toAddAtTheEnd += pointsDisque #les points sur lesquels il faudra pas repasser avec une brosse plus petite
		for cords in toAddAtTheEnd:
			if cords[0] < 0 or cords[0] >= img2[color].shape[0] or cords[1] < 0 or cords[1] >= img2[color].shape[1]:
				continue
			img2[color][cords[0]][cords[1]] = -1

temps = 0
for color in actions:
	for brushNb in range(len(actions[color])):
		temps += len(actions[color][brushNb])
temps *= pyautogui.PAUSE
print("Fini, temps de réalisation estimé à ",temps,"")

while True:
	pass





	