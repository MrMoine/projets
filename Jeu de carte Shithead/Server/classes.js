const crypto = require("crypto");

function randomIntFromInterval(min, max)
{
	return Math.floor(Math.random() * (max - min + 1) + min);
}
function createJeu()
{
	let jeu = new Array();
	for (let i = 0; i < 4; i++) 
	{
		for (let j = 0; j < 13; j++) 
		{
			let valeur, couleur;
			if (i === 0)
				couleur = "Pique";
			else if (i === 1)
				couleur = "Carreau";
			else if (i === 2)
				couleur = "Coeur";
			else if (i === 3)
				couleur = "Trefle";

			if (j === 0)
				valeur = "As";
			else if (j === 1)
				valeur = "Deux";
			else if (j === 2)
				valeur = "Trois";
			else if (j === 3)
				valeur = "Quatre";
			else if (j === 4)
				valeur = "Cinq";
			else if (j === 5)
				valeur = "Six";
			else if (j === 6)
				valeur = "Sept";
			else if (j === 7)
				valeur = "Huit";
			else if (j === 8)
				valeur = "Neuf";
			else if (j === 9)
				valeur = "Dix";
			else if (j === 10)
				valeur = "Valet"
			else if (j === 11)
				valeur = "Dame";
			else if (j === 12)
				valeur = "Roi";

			jeu.push(new Carte(valeur, couleur));
		}
	}
	return jeu;
}

function shuffle(array)
{
	for (let i = array.length - 1; i > 0; i--)
	{
		let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
		[array[i], array[j]] = [array[j], array[i]];
	}
}
let canPlace = {
	"Quatre": 0,
	"Cinq": 1,
	"Six": 2,
	"Sept": 3,
	"Huit": 4,
	"Neuf": 5,
	"Dix": 6,
	"Valet": 7,
	"Dame": 8,
	"Roi": 9,
	"As": 10,
	"Deux": 11,
	"Trois": 11,

};

let objScore =
{
	"Quatre": 0,
	"Cinq": 1,
	"Six": 2,
	"Sept": 5,
	"Huit": 7,
	"Neuf": 5,
	"Dix": 9,
	"Valet": 8,
	"Dame": 9,
	"Roi": 10,
	"As": 12,
	"Deux": 14,
	"Trois" : 15
}		

class Partie
{
	constructor(isPublic)
	{
		this.nbWon = 0;//le nb de joueurs qui ont gagnés
		this.isPublic = isPublic;
		this.timeOutPublic = null;
		this.compteurPret = 0;
		this.token = crypto.randomBytes(8).toString("hex");
		this.joueurs = new Array();
		this.pseudos = new Array();
		this.banID = new Array(); //les clients id des gens bans
		this.waiting = true;

		this.pioche = new Array();
		this.plisFerme = new Array();
		this.pliActuel = new Array();
		this.nbJeux = 0;
		this.iJoueurPlaying = 0;
		this.startPlay = null;
		this.timeOutId = null;
		this.intervalId = null;

		this.startRange = null;
		this.nbJoueurRange = 0;
		this.timeToRange = 30 * 1000;
	}
	startSoon(everySocket)
	{
		console.log("La partie commence automatiquement dans 1 minute");
		this.timeOutPublic = setTimeout(() =>
		{
			console.log("On commence, ça fait une minute");
			this.start(everySocket);
		}, 1 * 60 * 1000);
	}
	destruct()
	{
		clearTimeout(this.timeOutId);
		clearInterval(this.intervalId)
	}
	addPlayer(joueur, everySocket)
	{
		if (this.banID.indexOf(joueur.clientID) != -1) return;  //on l'ajoute pas si on trouve son id dans les id bannis
		this.joueurs.push(joueur);
		this.pseudos.push(joueur.pseudo);
		this.updateGameNotStarted(everySocket);
	}
	removePlayer(index, everySocket)
	{
		this.joueurs.splice(index, 1);
		this.pseudos.splice(index, 1);
		this.info(0, everySocket, "Un joueur vient de quitter la partie", "Un joueur vient de quitter la partie");
	}
	ban(index, everySocket)
	{
		this.banID.push(this.joueurs[index].clientID);
		for (let sName in everySocket)
		{
			if (everySocket[sName].handshake.session.id === this.joueurs[index].id)
				everySocket[sName].handshake.session.gameToken = undefined;

		}
		this.removePlayer(index, everySocket);
		this.updateGameNotStarted(everySocket);
	}
	isBan(clientId)
	{
		return this.banID.indexOf(clientId) != -1;
	}
	start(everySocket)
	{
		if (this.timeOutPublic != null)
			clearTimeout(this.timeOutPublic);

		for (let sName in everySocket)
		{
			if (everySocket[sName].handshake.session.gameToken === this.token)
			{
				everySocket[sName].emit("gameStarted");
				let iJoueur = -1;
				for (let i = 0; i < this.joueurs.length; i++)
				{
					if (this.joueurs[i].clientID === everySocket[sName].handshake.session.id)
						iJoueur = i;
				}
				if (iJoueur === -1) return;
				this.joueurs[iJoueur].isLeaving = true;
			}
		}
		this.waiting = false;
		//pour 5 joueur il faut un jeu, donc le nombre de jeu est égal au nombre de joueur divisé par 5 (arrondi au nombre entier supérieur)
		this.nbJeux = Math.ceil(this.joueurs.length / 5);
		for (let i = 0; i < this.nbJeux; i++)
			this.pioche.push(...createJeu());

		//pour commencer la partie si les gens mettent trop de temps à envoyer l'event "readyToDistribue"
		this.timeOutId = setTimeout(() =>
		{
			this.distribue(everySocket);
			this.compteurPret = null;
		}, 5000);
	}
	distribue(everySocket)
	{
		clearTimeout(this.timeOutId);
		//on mélange le jeu
		shuffle(this.pioche);
		//on distribue
		for (let i = 0; i < this.joueurs.length; i++)//pour chaque joueur
		{
			for (let j = 0; j < 3; j++)//pour chaque jeu
			{
				for (let k = 0; k < 3; k++)//pour chaque carte de chaque jeu
				{
					if (j === 0)
						this.joueurs[i].jeu['cache'].push(this.pioche.pop());
					else if (j === 1)
						this.joueurs[i].jeu['ouvert'].push(this.pioche.pop());
					else
						this.joueurs[i].jeu['perso'].push(this.pioche.pop());
				}
			}
		}
		this.updateGame(everySocket);
		//après avoir dit à tous les joueurs leur jeu on leur dit qu'ils ont un temps donné pour "ordonner" leur cartes
		for (let sName in everySocket)
		{
			let socket = everySocket[sName];
			if (socket.handshake.session.gameToken != this.token) continue;//si le joueur lié à cette socket est pas dans cette partie, on passe au suivant
			socket.emit("rangezJeu", this.timeToRange);//on leur envoie le temps qu'ils ont pour ranger le jeu (en ms)
		}

		this.pioche = [];//			TODO: A ENLEVER APRES LE DEBUG /!\

		this.startRange = new Date();
		this.timeOutId = setTimeout(() =>
		{
			this.rangerOver(everySocket);
		}, this.timeToRange);
	}
	trouvePire()
	{
		let pireJoueur = this.joueurs.sort((a, b) =>
		{
			let scoreA = 0;
			let scoreB = 0;

			for (let carteA of a.jeu["ouvert"])
			{
				scoreA += objScore[carteA.valeur] ** 2
			}

			for (let carteB of b.jeu["ouvert"])
			{
				scoreB += objScore[carteB.valeur] ** 2
			}
			return scoreA - scoreB;
		});
		for (let i = 0; i < this.joueurs.length; i++)
			if (pireJoueur === this.joueurs[i])
				return i;
	}
	updateGame(everySocket)
	{
		for (let sName in everySocket)
		{
			let socket = everySocket[sName];
			if (socket.handshake.session.gameToken != this.token) continue;//si le joueur lié à cette socket est pas dans cette partie, on passe au suivant
			let jeuAutres = new Array();
			let jeuPerso;
			for (let i = 0; i < this.joueurs.length; i++) 
			{
				const joueur = this.joueurs[i];
				if (joueur.clientID != socket.handshake.session.id)//si c'est pas le joueur actuel
				{
					jeuAutres.push({ "pseudo": joueur.pseudo, "jeu": joueur.jeu["ouvert"] });
				}
				else
					jeuPerso = { "ouvert": joueur.jeu["ouvert"], "perso": joueur.jeu["perso"], "nbHidden": joueur.jeu["cache"].length };

			}
			socket.emit("updateGame", jeuPerso, jeuAutres, this.pliActuel);
		}
	}
	updateGameNotStarted(everySocket)
	{
		for (let sName in everySocket)
		{
			if (!everySocket[sName].handshake.session.loggedin) continue;
			if (everySocket[sName].handshake.session.gameToken === this.token)//pour chaque "client socket" connecté on regarde si il est dans la partie de celui qui vient de quitter
			{
				everySocket[sName].emit("updateInfo", { "nbPlayer": this.joueurs.length, "pseudos": this.pseudos });
			}
		}
	}
	sendPlayerError(msg, everySocket)
	{
		for (let sName in everySocket)
		{
			if (everySocket[sName].handshake.session.gameToken === this.token)//pour chaque "client socket" connecté on regarde si il est dans la partie de celui qui vient de quitter
				everySocket[sName].emit("clientError", msg);
		}
	}
	rangerOver(everySocket)
	{
		if (this.startRange === null) return;//si c'estt déjà fini (tous les joueurs ont rangés)
		this.startRange = null;
		for (let sName in everySocket)
		{
			let session = everySocket[sName].handshake.session;
			let socket = everySocket[sName];
			if (!session.loggedin) continue;
			if (session.gameToken != this.token) continue;
			socket.emit("rangerOver");
		}
		this.gameStart(everySocket);
	}
	gameStart(everySocket)
	{
		// let i = Math.floor(Math.random() * this.joueurs.length);
		let i = this.trouvePire()
		this.intervalId = setInterval(() =>
		{
			this.updateGame(everySocket);
		}, 500);
		this.tellToPlay(i, everySocket);
	}
	tellToPlay(indexJoueur, everySocket)
	{
		let joueurToPlay = this.joueurs[indexJoueur];
		if (this.joueurs.length == 0)
			return this.end(everySocket)
		if (joueurToPlay === undefined)
			return this.tellToPlay(0, everySocket);//si le joueur à qui on dit de jouer existe pas on dit de jouer au premier joueur (y'en a forcément un sinon la partie est supprimée)

		// //console.log("************************************ ", joueurToPlay.pseudo, " joue  ************************************");
		let socketJoueur = joueurToPlay.findLinkedSocket(everySocket);
		if (socketJoueur === null)//quand il se passe ça faut kick un joueur de la partie car il est déco sans qu'on le sache
		{
			this.joueurs.splice(indexJoueur, 1);
			this.tellToPlay(0, everySocket);
			this.info(0, everySocket, "Un joueur a été déconnecté de la partie", "Un joueur a été déconnecté de la partie");
		}
		socketJoueur.emit("youPlay", 30 * 1000);//on dit au joueur avec le pire jeu que c'est à lui de jouer + le temps qu'il a pour jouer

		for (let sName in everySocket)
		{
			if (everySocket[sName].handshake.session.id != joueurToPlay.clientID && everySocket[sName].handshake.session.gameToken === this.token)
			{
				everySocket[sName].emit("currentlyPlaying", joueurToPlay.pseudo, 30 * 1000);//on dit à tous les autres joueurs le pseudo du joueur qui est en train de jouer
			}
		}
		this.iJoueurPlaying = indexJoueur;
		this.timeOutId = setTimeout(() =>
		{
			if (this.joueurs.length === 0) return;
			let indexSuivant;
			if (this.iJoueurPlaying + 1 === this.joueurs.length)
				indexSuivant = 0;
			else
				indexSuivant = this.iJoueurPlaying + 1;
			let joueur = this.joueurs[this.iJoueurPlaying];
			if (joueur === undefined)
				joueur = this.joueurs[0];

			for (let nomJeu in joueur.jeu)
			{
				if (joueur.jeu["perso"].length > 0)
				{
					if (nomJeu != "perso")
						continue;
				}
				else if (joueur.jeu["ouvert"].length > 0)
				{
					if (nomJeu != "ouvert")
						continue;
				}
				for (let i = 0; i < joueur.jeu[nomJeu].length; i++)
				{
					let carte = joueur.jeu[nomJeu][i];
					if (this.canPlayThat([carte]))
					{
						this.gameLoop([carte], everySocket);//si il peut jouer on joue et on arrête la fonction
						return;
					}
				}
			}
			//si on arrive ici c'est qu'il peut rien jouer, or si on lui a dit de jouer il pouvait forcément jouer donc on jette une erreur
			throw new Error("Un joueur a qui on a dit de jouer doit toujours pouvoir jouer. \n Cette partie du code doit jamais être atteinte normalement");

		}, 30 * 1000);
	}
	belongToPlayer(clientID, cards)
	{
		let joueur = this.findPlayer(clientID);
		if (joueur === null) return false;
		for (let i = 0; i < cards.length; i++)//pour chaque carte en argument
		{
			let inJeu = false;
			for (let nomJeu in joueur.jeu)
			{
				if (joueur.jeu["perso"].length > 0)//si il reste des cartes dans son jeu perso
				{
					if (nomJeu != "perso")
						continue;
				}
				else if (joueur.jeu["ouvert"].length > 0) //si il lui reste pas de cartes dans son jeu perso mais qu'il en reste dans son jeu ouvert
				{
					if (nomJeu != "ouvert")
						continue;
				}
				for (let j = 0; j < joueur.jeu[nomJeu].length; j++)//on regarde chaque carte du jeu perso du joueur 
				{

					if (joueur.jeu[nomJeu][j].valeur === cards[i].valeur && joueur.jeu[nomJeu][j].couleur === cards[i].couleur)//si la carte courrante du jeu du joueur est la même que celle en argument
						inJeu = true;
				}
				if (!inJeu)
					return false;
			}
		}
		return true;
	}
	allowToPlay(clientID, cartePlayed)
	{
		let iJoueur = -1;
		for (let i = 0; i < this.joueurs.length; i++)
		{
			if (this.joueurs[i].clientID === clientID)
				iJoueur = i;
		}
		if (iJoueur != this.iJoueurPlaying)
			return false;
		else
		{
			for (let i = 0; i < cartePlayed.length; i++)
			{
				if (!canPlace.hasOwnProperty(cartePlayed[i].valeur))
					return false;
				for (let j = 0; j < cartePlayed.length; j++)
				{
					if (cartePlayed[i].valeur != cartePlayed[j].valeur)//si y'a une carte qui a une valeur différente des autres c pas bon
						return false;
				}
			}
		}
		return iJoueur;
	}
	valeurLastCard()//la valeur de la dernire carte qui n'est pas un trois
	{
		if (this.pliActuel[this.pliActuel.length - 1] === undefined)//si y'a rien on part du principe que c'est un deux
			return "Deux";

		let nbTrois = 0;
		do
		{
			if (this.pliActuel[this.pliActuel.length - (1 + nbTrois)].valeur === "Trois")
				nbTrois++;
			else
				break;
		}
		while (this.pliActuel[this.pliActuel.length - (1 + nbTrois)] != undefined)//tant qu'il reste des cartes
		if (this.pliActuel[this.pliActuel.length - (1 + nbTrois)] === undefined)//si y'a rien on part du principe que c'est un deux
			return "Deux";
		return this.pliActuel[this.pliActuel.length - (1 + nbTrois)].valeur;
	}
	canPlayThat(cartes)//est ce qu'il est possible de jouer ses cartes
	{
		if (this.pliActuel.length === 0) return true;//si y'a aucune carte on peut jouer
		let valeurLasteCarte = this.pliActuel[this.pliActuel.length - 1].valeur;
		if (valeurLasteCarte === "Trois")//si la dernière carte est un trois on cherche sa valeur (celle qu'il copie)
			valeurLasteCarte = this.valeurLastCard();

		if (valeurLasteCarte === "Deux" || valeurLasteCarte === "Quatre") return true;//si la dernière carte est un deux ou un quatre on peut forcément jouer

		let valeur = cartes[0].valeur;
		if (valeur === "Trois" || valeur === "Deux") return true;//on peut toujours jouersi on joue un trois ou un deux
		if (valeur === "Trois")
			valeur = this.valeurLastCard();

		if (valeurLasteCarte === "Sept")//si la carte d'avant ct un sept 
		{
			if (canPlace[valeur] <= canPlace[valeurLasteCarte])//si la carte placé est plus petite ou égale que sept
				return true;
		}
		else
		{
			if (canPlace[valeur] >= canPlace[valeurLasteCarte])//si la carte placé est plus grande ou égale que celle d'avant
				return true;
		}
		return false;
	}
	canJoueurPlay(index)//si le joueur d'index passé en argument peut jouer
	{
		let joueur = this.joueurs[index];
		for (let nomJeu in joueur.jeu)
		{
			if (joueur.jeu["perso"].length > 0)//si il reste des cartes dans son jeu perso on regarde pas les autres
			{
				if (nomJeu != "perso")
					continue;
			}
			else if (joueur.jeu["ouvert"].length > 0)//pareil pour son jeu ouvert
			{
				if (nomJeu != "ouvert")
					continue;
			}
			else//si il reste pas de carte ni dans son jeu ouvert ni dans son jeu perso alors il peut tenter de jouer une carte de son jeu caché
				return true
			for (let i = 0; i < joueur.jeu[nomJeu].length; i++)
			{
				const carteJoueur = joueur.jeu[nomJeu][i];
				//on regarde si il peut jouer au moins une carte
				if (this.canPlayThat([carteJoueur]))
					return true;
			}
		}
		return false;
	}
	//si les cartes du jeu passé en argument sont dans le jeu du joueur dont on donne l'index (une carte peut passer d'un jeu ouvert à un jeu perso et inversement)
	belongToPlayerDebut(idJoueur, jeu)
	{
		if (typeof jeu != "object") return;
		let joueur = this.findPlayer(idJoueur);
		if (joueur === null) return false;
		if (jeu.perso === undefined || jeu.ouvert === undefined) return false;
		for (let nomJeu in jeu)//2x, nomJeu = "ouvert" | "perso" | "cache"
		{
			if (!(nomJeu === "ouvert" || nomJeu === "perso")) continue;//la carte peut pas être dans son jeu si elle vient pas des jeux "perso" ou "ouvert"
			if (!Array.isArray(jeu[nomJeu])) return false;//si les "jeux" (ouvert,perso, et caché) ne sont pas des tableaux le formet des données est pas bon

			for (let i = 0; i < jeu[nomJeu].length; i++)// x <nb de carte de chaque jeu> (x2)
			{
				//pour chaque carte du jeu en argument on va vouloir checker si elle est dans le jeu du joueur
				let carteArg = jeu[nomJeu][i];
				let carteFound = false;
				for (let nomJeuJoueur in joueur.jeu)
				{
					for (let i = 0; i < joueur.jeu[nomJeuJoueur].length; i++)//pour chaque carte du jeu en argument on regarde chaque carte du jeu du joueur
					{
						const carteJoueur = joueur.jeu[nomJeuJoueur][i];
						if (carteJoueur.valeur === carteArg.valeur && carteJoueur.type === carteArg.type)
						{
							carteFound = true;
							break;
						}
					}
				}
				if (!carteFound)
					return false;
			}
		}
		return true;//si toutes les cartes ont été trouvés dans le jeu du joueur alors c'est bon
	}
	info(indexJoueur, everySocket, msgPerso, msgTous)
	{
		let joueur = this.joueurs[indexJoueur];
		if (joueur === undefined) return console.error("Un pb a eu lieu");
		let socket = joueur.findLinkedSocket(everySocket);
		if (socket === null) return console.error("ce joueur est déconnecté");
		let id = socket.handshake.session.id;
		for (let sName in everySocket)
		{
			const socket = everySocket[sName];
			if (socket.handshake.session.gameToken != this.token) continue;
			if (socket.handshake.session.id === id)
				socket.emit("infoClient", msgPerso);
			else
				socket.emit("infoClient", msgTous)

		}

	}


	gameLoop(cartePlayed, everySocket)
	{
		//INFO: on a checké avant que toutes les cartes avaient la même valeur donc : cartePlayed[0].valeur => valeur de toutes les cartes jouées
		//console.log("Il joue ", cartePlayed.length, " ", cartePlayed[0].valeur);
		//on supprime le timeOut qui est là pour passer le tour
		let valeurPlayed = cartePlayed[0].valeur;
		clearTimeout(this.timeOutId);
		let joueur = this.joueurs[this.iJoueurPlaying];//vu u'on est sur que c'est le bon joueur qui joue (on a checké avant)
		if (joueur == undefined || this.joueurs.length <= 1)
			return this.end(everySocket)

		if (valeurPlayed === "Trois")
			valeurPlayed = this.valeurLastCard();//si il vient de jouer un Trois, le trois copie donc c'est comme si il venait de jouer la dernière carte du tas

		//#region placer/piocher
		this.pliActuel.push(...cartePlayed)//on ajoute la/les carte jouée au pli actuel (on a checké avant si ct autorisé)
		//on retire les cartes jouées du jeu du mec

		function isSame(elementCourant)
		{
			for (let i = 0; i < cartePlayed.length; i++)
			{
				if (elementCourant.valeur === cartePlayed[i].valeur && elementCourant.couleur === cartePlayed[i].couleur)//si la carte est la même on la garde pas
					return false;
			}
			return true;
		}
		if (joueur.jeu["perso"].length > 0)
			joueur.jeu["perso"] = joueur.jeu["perso"].filter(isSame);
		else if (joueur.jeu["ouvert"].length > 0)
			joueur.jeu["ouvert"] = joueur.jeu["ouvert"].filter(isSame);
		else
			joueur.jeu["cache"] = joueur.jeu["cache"].filter(isSame);

		//console.log("On enlève une carte");
		while (joueur.jeu["perso"].length < 3 && this.pioche.length > 0)//si il a moins de trois cartes et que la pioche contient des cartes ils pioche jusqu'a ce qu'il en ai trois
			joueur.jeu["perso"].push(this.pioche.pop());

		//#endregion

		//si le joueur n'as plus de cartes, il a gagné on l'enlève de la partie
		if (joueur.jeu["ouvert"].length === 0 && joueur.jeu["cache"].length === 0 && joueur.jeu["perso"].length === 0)//si il lui reste aucunes cartes on le reture
		{
			const joueurWin = this.joueurs[this.iJoueurPlaying];
			let socket = joueurWin.findLinkedSocket(everySocket);
			this.nbWon++;
			socket.emit("win", this.nbWon, "rgb(" + joueurWin.couleur.r + "," + joueurWin.couleur.g + "," + joueurWin.couleur.r + ")");
			this.removePlayer(this.iJoueurPlaying, everySocket);
			if (this.joueurs.length <= 1)
				return this.end();
			let iSuivant = this.iJoueurPlaying + 1;
			if (iSuivant >= this.joueurs.length)
				iSuivant = 0;

			return this.tellToPlay(iSuivant, everySocket);
		}
		//maintenant faut voir qui est le suivant et si il peut jouer
		let iSuivant = this.iJoueurPlaying;//l'index du joueur suivant (pour l'instant c'est celui du joueur actuel mais on va l'augmenter)
		let toursSaute = 1;//le nombre de tours sauté, si c pas un huit c'est un seul (on passe au suivant)
		if (valeurPlayed === "Huit")
		{
			this.info(this.iJoueurPlaying, everySocket, "Vous avez sauté " + String(cartePlayed.length) + " tours", this.joueurs[this.iJoueurPlaying].pseudo + " a sauté " + String(cartePlayed.length) + " tours");
			toursSaute += cartePlayed.length;
		}
		for (let i = 0; i < toursSaute; i++)
		{
			if (iSuivant < this.joueurs.length - 1)
				iSuivant++;
			else
				iSuivant = 0;
		}
		//		/!\ Voir si ce truc fonctionne bien
		//#region quatre cartes pareilles ?
		let quatrePareilles = true;
		for (let i = 0; i < 4; i++)
		{
			if (this.pliActuel[this.pliActuel.length - (1 + i)] === undefined)//si on a atteint le début du jeu
			{
				quatrePareilles = false;
				break;
			}

			let valeur = this.pliActuel[this.pliActuel.length - (1 + i)].valeur;
			if (valeur === "Trois")//si c'est un trois on cherche la carte qu'il copie
			{
				let nbTrois = 0;
				do
				{
					if (this.pliActuel[this.pliActuel.length - (1 + i + nbTrois)].valeur === "Trois")
						nbTrois++;
					else
						break;
				}
				while (this.pliActuel[this.pliActuel.length - (1 + i + nbTrois)] != undefined)//tant qu'il reste des cartes
				if (this.pliActuel[this.pliActuel.length - (1 + i + nbTrois)] === undefined)//si y'a un trois sur rien alors il est égal à rien (deux ou quatre)
					valeur = "Deux";
				else
					valeur = this.pliActuel[this.pliActuel.length - (1 + i + nbTrois)].valeur;
			}
			let derniereValeur = this.valeurLastCard();
			if (valeur != derniereValeur)//si la valeur est différente de la dernière carte alors on a pas fermé le pli
			{
				quatrePareilles = false;
				break;
			}

		}
		//#endregion
		if (valeurPlayed === "Dix" || quatrePareilles)//si il a mis un dix ou que y'a quatre cartes pareilles d'affillé il ferme le pli
		{
			this.plisFerme.push(this.pliActuel);
			this.pliActuel = [];
			this.info(this.iJoueurPlaying, everySocket, "Vous avez fermé le plis vous rejouez", this.joueurs[this.iJoueurPlaying].pseudo + " a fermé le plis, il/elle rejoue");
			iSuivant = this.iJoueurPlaying;
		}


		if (!this.canJoueurPlay(iSuivant))//si le suivant peut pas jouer il prend et on fait jouer le suivant
		{
			//console.log("Le suivant peut pas jouer il prend");
			this.joueurs[iSuivant].jeu["perso"].push(...this.pliActuel);//il ramasse le pli actuel
			this.info(iSuivant, everySocket, "Vous venez de prendre " + String(this.pliActuel.length) + " cartes", this.joueurs[iSuivant].pseudo + " viens de prendre");
			this.pliActuel = [];
			if (iSuivant < this.joueurs.length - 1)
				iSuivant++;
			else
				iSuivant = 0;
		}
		//console.log("Le prochain à jouer est ", this.joueurs[iSuivant].pseudo);
		this.updateGame(everySocket);
		this.tellToPlay(iSuivant, everySocket)
	}
	playHidden(index, everySocket)//quand un joueur joue une de ses cartes cachées 
	{
		let joueur = this.joueurs[this.iJoueurPlaying];
		let carte = joueur.jeu["cache"][index];

		if (this.canPlayThat([carte]))
			this.gameLoop([carte], everySocket);
		else
		{
			this.pliActuel.push(carte);
			joueur.jeu["cache"].splice(index, 1);
			joueur.jeu["perso"].push(...this.pliActuel);
			this.pliActuel = [];
			if (this.iJoueurPlaying + 1 === this.joueurs.length)
				this.tellToPlay(0, everySocket);
			else
				this.tellToPlay(this.iJoueurPlaying + 1, everySocket);
		}
	}
	findPlayer(clientID)
	{
		let joueur = null;
		for (let i = 0; i < this.joueurs.length; i++)
		{
			if (this.joueurs[i].clientID === clientID)//si on trouve le joueur avec l'id corresspondant
				joueur = this.joueurs[i];
		}
		return joueur;
	}
	sendMsg(msg, senderId, everySocket)
	{
		let admin = false;
		let joueur = null;
		for (let i = 0; i < this.joueurs.length; i++)	
		{
			if (this.joueurs[i].clientID === senderId)
			{
				if (i === 0)
					admin = true;
				joueur = this.joueurs[i];
				break;
			}
		}
		if (this.isPublic)
			admin = false;
		if (joueur === null) return;
		let couleur = "rgb(" + String(joueur.couleur.r) + "," + String(joueur.couleur.g) + "," + String(joueur.couleur.b) + ")";
		for (let sNom in everySocket)
		{
			let socket = everySocket[sNom];
			let session = socket.handshake.session;
			if (session.gameToken === this.token)
			{
				socket.emit("newMsg", msg, couleur, admin, joueur.pseudo);
			}
		}
	}
	end(everySocket)
	{
		for (let idSocket in everySocket)
		{
			const socket = everySocket[idSocket];
			if (socket.handshake.session.gameToken == this.token)
				socket.emit("end");
		}
	}

}
function nbTrois(cartes)
{
	let nbTrois = 0;
	do//tant qu'on trouve que des trois dans la pioche
	{
		if (cartes[cartes.length - nbTrois].valeur === "Trois")
			nbTrois++;
		else
			break;
	}
	while (cartes[cartes.length - nbTrois] != undefined);
	return nbTrois;
}


class Joueur
{
	constructor(clientID, pseudo)
	{
		this.pseudo = pseudo;
		this.clientID = clientID;
		this.isLeaving = false;
		this.couleur = {
			"r": randomIntFromInterval(50, 150),
			"g": randomIntFromInterval(50, 150),
			"b": randomIntFromInterval(50, 150)
		};
		this.jeu = {
			"ouvert": [],
			"perso": [],
			"cache": []
		};
		this.hasRange = false;
	}
	findLinkedSocket(everySocket)
	{
		for (let sName in everySocket)
		{
			if (everySocket[sName].handshake.session.id === this.clientID)
				return everySocket[sName];
		}
		return null;
	}
}

class Carte
{
	constructor(valeur, couleur)
	{
		this.valeur = valeur;
		this.couleur = couleur;
	}
}

exports.Partie = Partie;
exports.Joueur = Joueur;
exports.Carte = Carte;
