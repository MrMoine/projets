// INFO: L'enfant n°0 des div de jeux perso est le titre pas la première carte

socket.emit("test")
let jeuxAutres = new Array();
let exJeuAutres = new Array();
let jeuMoi = {
	"perso": [],
	"ouvert": [],
	"nbHidden": 3
};
let canRange = false;
let canPlay = false;
let isAffiche = false;
let tempsRestant = 0;
let intervalId;
let carteSelect = [];
let pioche = [];
let exJeu = [];
let firstTime = false;
socket.on("updateGame", (jeuMoiSock, jeuAutres, sockPioche) =>
{
	if (!canRange)
	{
		exJeu = jeuMoi;
		jeuMoi = jeuMoiSock;
	}
	pioche = sockPioche;
	exJeuAutres = jeuxAutres;
	jeuxAutres = jeuAutres;
	updateDOM();
});
socket.on("clientError", (msgErreur) =>
{
	const form = document.createElement('form');
	form.method = "POST";
	form.action = "./error";
	form.style.display = "hidden";

	const codeDom = document.createElement('input');
	codeDom.type = 'hidden';
	codeDom.name = "code";
	codeDom.value = 418;


	const msgDom = document.createElement('input');
	msgDom.type = 'hidden';
	msgDom.name = "msg";
	msgDom.value = msgErreur;


	form.appendChild(msgDom);
	form.appendChild(codeDom);
	document.body.appendChild(form);
	form.submit();
});
//quand le serveur donne un temps pour ranger son jeu
socket.on("rangezJeu", (timeToRange) =>
{
	console.log("On doit ranger notre jeu");
	document.getElementById("info").textContent = "Vous avez " + String(timeToRange / 1000) + " secondes pour échanges des cartes entre votre jeu ouvert et votre jeu privé";
	document.getElementById("info").style.color = "green";
	tempsRestant = timeToRange;
	//pour changer le nombre de secondes restantes + la couleur du texte
	intervalId = window.setInterval(() =>
	{
		tempsRestant -= 1000;
		document.getElementById("info").textContent = "Vous avez " + String(tempsRestant / 1000) + " secondes pour échanges des cartes entre votre jeu ouvert et votre jeu privé";

		if (tempsRestant <= 10000)
			document.getElementById("info").style.color = "orange";
		if (tempsRestant <= 5000)
			document.getElementById("info").style.color = "red";
		if (tempsRestant < 0)
		{
			document.getElementById("info").textContent = "Vous n'avez plus que quelques secondes pour échanges des cartes entre votre jeu ouvert et votre jeu privé";
		}
	}, 1000);
	let boutonValider = document.createElement("button");
	boutonValider.id = "btnValiderChange";
	boutonValider.textContent = "Valider les échanges";
	boutonValider.onclick = () =>
	{
		socket.emit("rangerFini", jeuMoi);
		for (let nomJeu in jeuMoi)
		{
			if (nomJeu === "nbHidden") continue;
			for (let i = 0; i < jeuMoi[nomJeu].length; i++)
			{
				let carte = document.getElementById(nomJeu).children[i];
				carte.onclick = null;
				carte.style.cursor = "default";
			}
		}
		boutonValider.parentElement.removeChild(boutonValider);//suicide de bouton
	};
	document.getElementById("middleContent").appendChild(boutonValider);
	canRange = true;
	updateDOM();
});
socket.on("rangerOver", () =>
{
	canRange = false;
	let btn = document.getElementById("btnValiderChange");
	if (btn != null)
		btn.parentNode.removeChild(btn);
	let msg = document.getElementById("info");
	msg.innerHTML = "";
	window.clearInterval(intervalId);
	for (let nomJeu in jeuMoi)
	{
		if (nomJeu === "nbHidden") continue;
		for (let i = 0; i < jeuMoi[nomJeu]; i++)
		{
			let carte = document.getElementById(nomJeu).children[i];
			carte.onclick = null;
			carte.style.cursor = "default";
		}
	}
	updateDOM();
});
socket.on("youPlay", (timeToPlay) =>
{
	console.log("C'est à moi de jouer");
	canPlay = true;
	firstTime = true;
	window.clearInterval(intervalId);
	document.getElementById("info").textContent = "C'est à vous de jouer, vous avez " + String(timeToPlay / 1000) + " secondes pour jouer";
	document.getElementById("info").style.color = "green";
	tempsRestant = timeToPlay;
	intervalId = window.setInterval(() =>
	{
		tempsRestant -= 1000;
		let texte = document.getElementById("info");
		texte.textContent = "C'est à vous de jouer, vous avez " + String(tempsRestant / 1000) + " secondes pour jouer";
		if (tempsRestant <= 10000)
			texte.style.color = "orange";
		if (tempsRestant <= 5000)
			texte.style.color = "red";
		if (tempsRestant <= 0)
			texte.textContent = "";
	}, 1000);
	document.getElementById("tas").onclick = playCard;
	updateDOM();

});
socket.on("currentlyPlaying", (pseudo, timeToPlay) =>
{
	console.log("C'est a ", pseudo, " de jouer");
	carteSelect = [];
	canPlay = false;
	window.clearInterval(intervalId);
	document.getElementById("info").textContent = "C'est à " + pseudo + " de jouer, il/elle a " + String(timeToPlay / 1000) + " secondes pour jouer";
	document.getElementById("info").style.color = "black";
	tempsRestant = timeToPlay;
	intervalId = window.setInterval(() =>
	{
		tempsRestant -= 1000;
		let texte = document.getElementById("info");
		texte.textContent = "C'est à " + pseudo + " de jouer, il/elle a " + String(tempsRestant / 1000) + " secondes pour jouer";

	}, 1000);
	updateDOM();

});

socket.on("infoClient", (msg) =>
{
	console.log(msg);
	document.getElementById("msgServer").textContent = msg;
	setTimeout(() =>
	{
		document.getElementById("msgServer").textContent = "";
	}, 3000);
});

socket.on("newMsg", (msg, couleur, admin, pseudo) =>
{
	let chatDisplay = document.getElementById("chatDisplay");
	let msgDom = document.createElement("p");
	let pseuDom = document.createElement("span");
	pseuDom.textContent = "<" + pseudo + "> ";
	pseuDom.style.color = couleur;
	pseuDom.className = admin ? "pseudoAdmin" : "pseudoNormal";
	msgDom.textContent = msg;
	msgDom.className = admin ? "msgAdmin" : "msgNormal";
	msgDom.insertBefore(pseuDom, msgDom.childNodes[0]);
	chatDisplay.appendChild(msgDom);
	chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

socket.on("end", () =>
{
	console.log("La partie est finie")
	document.getElementById("msgServer").textContent = "La partie est terminé, vous allez être redirigé à l'acceuil";
	setTimeout(() => {
		location = location.origin;
	}, 1500);
});

function select(index, jeu)
{
	let caseClique = document.getElementById(jeu).children[index];
	caseClique.style.border = "5px solid green";
	for (let nomJeu in jeuMoi)
	{
		if (nomJeu === "nbHidden") continue;
		for (let i = 0; i < jeuMoi[nomJeu].length; i++)
		{
			let carte = document.getElementById(nomJeu).children[i];
			carte.onclick = () =>
			{
				swap(index, jeu, i, nomJeu);
			};
			carte.title = "Cliquer pour échanger cette carte avec la carte sélectionnée";
		}
	}

}

function swap(index1, jeu1, index2, jeu2)
{
	[jeuMoi[jeu1][index1], jeuMoi[jeu2][index2]] = [jeuMoi[jeu2][index2], jeuMoi[jeu1][index1]];
	updateDOM();
	for (let nomJeu in jeuMoi)
	{
		if (nomJeu === "nbHidden") continue;
		for (let i = 0; i < jeuMoi[nomJeu].length; i++)
		{
			let carte = document.getElementById(nomJeu).children[i];

			carte.onclick = () =>
			{
				select(i, nomJeu);
			};
			carte.style.border = "1px solid gray";
			carte.title = "Cliquer pour échanger cette carte avec une autre";
		}
	}
}
function playCard()
{
	socket.emit("playing", carteSelect);
}

function updateDOM()
{
	//#region jeuPerso
	for (let nomJeu in jeuMoi)
	{
		if (nomJeu === "nbHidden") continue;
		let jeu = document.getElementById(nomJeu);

		if (JSON.stringify(exJeu[nomJeu]) === JSON.stringify(jeuMoi[nomJeu])) continue;//si les deux jeux sont les mêmes ou qu'on est en train de les modifiers ont update pas
		jeu.innerHTML = "";
		for (let i = 0; i < jeuMoi[nomJeu].length; i++)
		{
			const carte = jeuMoi[nomJeu][i];
			let carteDom = document.createElement("img");
			carteDom.src = "/images/" + carte.couleur.toLowerCase() + "_" + carte.valeur.toLowerCase() + ".png";
			carteDom.className = "carteMoi";
			jeu.appendChild(carteDom);
		}
	}

	//#endregion
	//#region jeuxAutres
	let domJeuAutres = document.getElementById("listeAutres");
	if (JSON.stringify(jeuxAutres) != JSON.stringify(exJeuAutres))//si tous les joueurs du html (- le titre) est différent du nombre de joueurs de la partie, on update
	{
		for (let i = 1; i < domJeuAutres.children.length; i++) 
		{
			if (i === 0) continue;//le premier élément est un titre
			const element = domJeuAutres.children[i];
			domJeuAutres.removeChild(element);
		}

		for (let i = 0; i < jeuxAutres.length; i++)
		{
			let conteneurHover = document.createElement("div");
			conteneurHover.className = "dropdown";

			let bouton = document.createElement("button");
			bouton.textContent = jeuxAutres[i].pseudo;
			bouton.className = "dropbtn";
			let cacher = () =>
			{
				document.getElementById("listeAutres").style.width = "200px";
				document.getElementById("middleContent").style.marginLeft = "250px";
				dropdownContent.style.display = "none";
				bouton.style.backgroundColor = "black";
				bouton.style.color = "white";
			};
			let decacher = () =>
			{
				document.getElementById("listeAutres").style.width = "500px";
				document.getElementById("middleContent").style.marginLeft = "550px";
				dropdownContent.style.display = "flex";
				bouton.style.backgroundColor = "white";
				bouton.style.color = "black";
			};
			bouton.onmouseover = decacher;
			bouton.onmouseout = cacher;
			bouton.onclick = () =>
			{
				if (bouton.onmouseover === null)
				{
					bouton.onmouseover = decacher;
					bouton.onmouseout = cacher;
				}
				else
				{
					bouton.onmouseover = null;
					bouton.onmouseout = null;
				}
			};

			let dropdownContent = document.createElement("div");
			for (let j = 0; j < jeuxAutres[i].jeu.length; j++) 
			{
				const carte = jeuxAutres[i].jeu[j];
				let carteDom = document.createElement("img");
				carteDom.src = "./images/" + carte.couleur.toLowerCase() + "_" + carte.valeur.toLowerCase() + ".png";
				carteDom.className = "carteAutre";
				dropdownContent.appendChild(carteDom);
			}
			dropdownContent.className = "dropdown-content";

			conteneurHover.appendChild(bouton);
			conteneurHover.appendChild(dropdownContent);
			domJeuAutres.appendChild(conteneurHover);
		}
	}
	//#endregion
	if (canRange)
	{
		for (let i = 0; i < 3; i++)
		{
			let cartePerso = document.getElementById("perso").children[i];
			let carteOuvert = document.getElementById("ouvert").children[i];
			cartePerso.onclick = () =>
			{
				select(i, "perso");
			};
			carteOuvert.onclick = () =>
			{
				select(i, "ouvert");
			};
			cartePerso.title = "Cliquer pour échanger cette carte avec une autre";
			carteOuvert.title = "Cliquer pour échanger cette carte avec une autre";
		}
	}
	if (canPlay)
	{
		if(jeuMoi["ouvert"].length > 0 && jeuMoi["perso"].length > 0)
			document.getElementById("tas").onclick = playCard;
		
		if (JSON.stringify(jeuMoi) != JSON.stringify(exJeu) || firstTime)//si le jeu est différent de l'ancien (il a été update)
		{
			if (jeuMoi["ouvert"].length > 0 || jeuMoi["perso"].length > 0)
			{
				firstTime = false;
				for (let nomJeu in jeuMoi)
				{
					if (nomJeu === "nbHidden") continue;
					for (let i = 0; i < jeuMoi[nomJeu].length; i++)
					{
						let carte = document.getElementById(nomJeu).children[i];//y'a le mm nombre d'enfant que le nb de cartes
						if (jeuMoi["perso"].length > 0)
						{
							if (nomJeu != "perso")
								continue;
						}
						else if (jeuMoi["ouvert"].length > 0)
						{
							if (nomJeu != "ouvert")
								continue;
						}
						carte.onclick = () =>
						{
							if (!canPlay) return;//on peut pas appeller la fonction si on peut pas jouer
							if (carteSelect[0] != undefined)
							{
								if (carteSelect[0].valeur === jeuMoi[nomJeu][i].valeur)
									carteSelect.push(jeuMoi[nomJeu][i]);
								else
									carteSelect = [jeuMoi[nomJeu][i]];
							}
							else
								carteSelect = [jeuMoi[nomJeu][i]];
							updateDOM();
						};
					}
				}
			}
			else if (jeuMoi["nbHidden"] > 0)
			{
				if (JSON.stringify(exJeu) != JSON.stringify(jeuMoi))
				{
					console.log("Il reste plus que le jeu caché !");
					document.getElementById("perso").innerHTML = "";
					document.getElementById("ouvert").innerHTML = "";
					let divFerme = document.getElementById("cache");
					divFerme.style.display = "initial";
					divFerme.id = "cache";
					divFerme.innerHTML = "";
					for (let i = 0; i < jeuMoi["nbHidden"]; i++)
					{
						let dos = document.createElement("img");
						dos.className = "carteDos";
						dos.src = "./images/carte_dos.png";
						dos.onclick = () =>
						{
							for (let j = 0; j < jeuMoi["nbHidden"]; j++)
							{
								const currentHidden = divFerme.children[j];
								currentHidden.style.border = "1px solid gray";//test
							}
							dos.style.border = "2px solid green";

							console.log('Carte selectionnée');
							document.getElementById("tas").onclick = () =>
							{
								console.log("Carte jouée");
								socket.emit("playingHidden", i);
							};
						};
						divFerme.appendChild(dos);
					}
					document.getElementById("middleContent").appendChild(divFerme);
				}
			}

		}
	}
	if (jeuMoi["nbHidden"] === 0)
	{
		document.getElementById("cache").innerHTML = "";
	}
	//#region carte à jouer / joué
	let tasMsg = document.getElementById("tasMsg")
	tasMsg.style.display = "initial";

	if (carteSelect.length > 0)
		document.getElementById("tas").style.cursor = "pointer";
	if (carteSelect.length === 1)
		tasMsg.textContent = "Jouer cette carte";
	else if (carteSelect.length > 1)
		tasMsg.textContent = "Jouer ces cartes";
	else
	{
		tasMsg.textContent = "";
		tasMsg.style.display = "none";
	}

	for (let nomJeu in jeuMoi)
	{
		if (nomJeu === "nbHidden") continue;
		for (let j = 0; j < jeuMoi[nomJeu].length; j++)
			document.getElementById(nomJeu).children[j].style.border = "1px solid gray";
	}
	for (let i = 0; i < carteSelect.length; i++)
	{
		for (let nomJeu in jeuMoi)
		{
			if (nomJeu === "nbHidden") continue;
			for (let j = 0; j < jeuMoi[nomJeu].length; j++) 
			{
				if (JSON.stringify(carteSelect[i]) === JSON.stringify(jeuMoi[nomJeu][j]))//si on a trouvé la carte 
				{
					document.getElementById(nomJeu).children[j].style.border = "5px solid green";
				}
			}
		}
	}
	if (pioche.length === 0)
	{
		document.getElementById("tas").textContent = "Aucune cartes";
		document.getElementById("tasDropdown").innerHTML = "";
	}
	else
	{
		let tas = document.getElementById("tas");
		tas.innerHTML = "";
		let imgCarte = document.createElement("img");
		imgCarte.src = "./images/" + pioche[pioche.length - 1].couleur.toLowerCase() + "_" + pioche[pioche.length - 1].valeur.toLowerCase() + ".png";
		tas.appendChild(imgCarte);
		let dropdown = document.getElementById("tasDropdown");
		dropdown.innerHTML = "";
		for (let i = pioche.length - 2; i >= 0; i--)//les quatres dernières cartes de la pioche
		{
			if (i < pioche.length - 5) break;
			let img = document.createElement("img");
			img.src = "./images/" + pioche[i].couleur.toLowerCase() + "_" + pioche[i].valeur.toLowerCase() + ".png";
			img.className = "carte";
			dropdown.appendChild(img);
		}
		let show = document.getElementById("tasShow");
		show.onmouseover = () =>
		{
			dropdown.style.display = "flex";
		};
		show.onmouseout = () =>
		{
			dropdown.style.display = "none";
		};

	}
	//#endregion

}

socket.on("win", (nb, couleur) =>
{
	const form = document.createElement('form');
	form.method = "POST";
	form.action = "./win";
	form.style.display = "hidden";

	const nbDom = document.createElement('input');
	nbDom.type = 'hidden';
	nbDom.name = "nb";
	nbDom.value = nb;


	const couleurDom = document.createElement('input');
	couleurDom.type = 'hidden';
	couleurDom.name = "couleur";
	couleurDom.value = couleur;


	form.appendChild(nbDom);
	form.appendChild(couleurDom);
	document.body.appendChild(form);
	form.submit();
});

//pour que faire entré dans l'input de texte fasse comme si on cliquait sur le bouton
var input = document.getElementById("chatWrite");
input.addEventListener("keydown", function (event)
{
	if (event.keyCode === 13)
	{
		event.preventDefault();
		document.getElementById("sendMsg").click();
	}
});

function sendMsg()
{
	let inputMSg = document.getElementById("chatWrite");
	let msg = inputMSg.value;
	socket.emit("sendMsg", msg);
	inputMSg.value = "";
}