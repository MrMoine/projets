/*
	shithead 2.0 - Antonin GROS
	INFO: quand on actualise une page on est déconnecté puis reconnecté si possible, du coup quand un admin actualise la partie est supprimée car l'admin a quitté
*/

//#region require
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require("path");
const sharedsession = require("express-socket.io-session");
const { Partie, Joueur } = require("./classes.js");
const request = require('request');
const bodyParser = require('body-parser');
const sanitizer = require('sanitizer');
//#endregion

//#region paramétrage et déclarations de variables globales
var parties = new Array(); //pour stocker toutes les parties
const debug = false;		//		/!\ penser a repasser debug à false avant de publier le projet 
app.set('view engine', 'ejs');
//paramétrage de sessions express et socket.io
const domaineName = "http://rund1dcd.fbxos.fr:8080/";
var session = require("express-session")({
	secret: "PMacdgyEyoWnuL1qI8DH",
	resave: true,
	saveUninitialized: true
});
app.use(session);

io.use(sharedsession(session, {
	autoSave: true
}));
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(express.static(path.resolve("./Client/")));
//#endregion

//#region routes
app.get('/', function (req, res)
{
	res.sendFile(path.resolve('./Client/lobby.html'));
});

app.get("/create", (req, res) =>
{
	if (!req.session.loggedin) return res.redirect("/login?red=create");
	if (req.session.compteur > 20)//on peut créer 20 parties max, puis il faut refaire un captcha
	{
		req.session.loggedin = false;
		return res.redirect("./relogin");
	}
	parties.push(new Partie(false));//on ajoute la partie, son index est le dernier élément du tableau

	req.session.compteur++;
	res.redirect("./join?token=" + String(parties[parties.length - 1].token));//on redirige vers la partie qu'on vient de créer
});

app.get("/matchmaking", (req, res) =>
{
	if (!req.session.loggedin) return res.redirect("/login?red=matchmaking");
	for (let i = 0; i < parties.length; i++)
	{
		const partie = parties[i];
		if (!partie.isPublic) continue;//on peut pas rejoindre une partie qui n'est pas publique
		if (!partie.waiting) continue;//on peut pas rejoindre une partie qui a déjà commencée
		//sinon on la rejoint
		return res.redirect("/join?token=" + partie.token);
	}
	//Si on arrive ici c'est que y'a aucune parties publiques en attente de joueurs, on en créé donc une
	console.log("Aucune partie publique trouvée");
	parties.push(new Partie(true));
	req.session.compteur++;
	res.redirect("./join?token=" + String(parties[parties.length - 1].token));
});

app.get("/join", (req, res) =>
{
	if (!req.session.loggedin) return res.redirect("/login?red=join?token=" + req.query.token);
	let iPartie = -1;
	for (let i = 0; i < parties.length; i++)
	{
		if (parties[i].token === req.query.token)//si on trouve la partie qu'il recherche
			iPartie = i;
	}
	if (iPartie === -1)//si on a pas trouvé la partie on fout une erreur
		return erreur(res, "La partie que vous essayez de rejoindre n'existe pas", 404);

	//on check si il est pas ban de la partie
	if (parties[iPartie].isBan(req.session.id))
		return erreur(res, "Vous avez été exclu de cette partie, vous ne pouvez plus revenir", 403);

	//on check si la partie accepte encore des joueurs
	if (!parties[iPartie].waiting)
		return erreur(res, "La partie a déjà commencé, elle n'accepte plus de joueurs", 410);

	if (parties[iPartie].isPublic)//si la partie est publique alors y'a pas d'admin
	{
		return res.render("waiting.ejs", {
			token: req.query.token,
			admin: false,
			partie: parties[iPartie],
			adresse: domaineName
		});
	}
	if (parties[iPartie].joueurs.length === 0)//si y'a aucun joueur, la partie vient juste d'être créé donc le premier à rejoindre est l'admin (par définition)
	{
		return res.render("waiting.ejs", {
			token: req.query.token,
			admin: true,
			partie: parties[iPartie],
			adresse: domaineName
		});
	}
	if (parties[iPartie].joueurs[0].clientID === req.session.id)//si le premier joueur de la partie est le client actuel, alors c'est l'admin
	{
		return res.render("waiting.ejs", {
			token: req.query.token, admin: true,
			partie: parties[iPartie],
			admin: true,
			adresse: domaineName
		});
	}
	//sinon, c'est pas un admin
	res.render("waiting.ejs", {
		token: req.query.token,
		admin: false,
		partie: parties[iPartie],
		adresse: domaineName
	});
});

//demande de valider un captcha et d'entrer un pseudo puis redirige
app.get("/login", (req, res) =>
{
	res.sendFile(path.resolve('./Client/login.html'));
});

app.post('/login', (req, res) =>
{
	let redirectURL;
	if (req.query.red != undefined)
		redirectURL = req.query.red;
	else
		redirectURL = "/";

	if (req.body === undefined || req.body === '' || req.body === null)
		return erreur(res, "Erreur, aucune donnée reçue", 400);
	if (debug)
	{
		req.session.loggedin = true;
		req.session.compteur = 0;
		if (typeof req.body.pseudo === 'string')
		{
			if (req.body.pseudo.length > 0 && req.body.pseudo.length < 25)
			{
				req.session.pseudo = sanitizer.escape(req.body.pseudo);
			}
			else
				req.session.pseudo = "<Pseudo invalide>";
		}
		else
			req.session.pseudo = "<Pseudo invalide>";
		res.redirect(redirectURL);
		return;
	}
	var options = {
		url: "https://www.google.com/recaptcha/api/siteverify",
		method: 'POST',
		form: {
			"secret": "6LfMrOIUAAAAAOA9uLD5ix5T4AFPa28INJbsXkFv",
			"response": req.body["g-recaptcha-response"]
		}
	};
	request(options, function (error, response, body)
	{
		if (!error && response.statusCode == 200)
		{
			let result = JSON.parse(body);
			if (result["success"])
			{
				req.session.loggedin = true;
				req.session.compteur = 0;
				if (typeof req.body.pseudo === 'string')
				{
					if (req.body.pseudo.length > 0 && req.body.pseudo.length < 25)
						req.session.pseudo = sanitizer.escape(req.body.pseudo);
					else
						req.session.pseudo = "<Pseudo invalide>";
				}
				else
					req.session.pseudo = "<Pseudo invalide>";
				res.redirect(redirectURL);
			}
			else
			{
				erreur(res, "Le captcha n'est pas valide, vous êtes peut être un robot", 401);
			}
		}
		else
			console.error(error);
	});
});
//demande juste un captcha puis redirige
app.get('/relogin', (req, res) =>
{
	let redirectURL;
	if (req.query.red != undefined)
		redirectURL = req.query.red;
	else
		redirectURL = "/";
	//si l'utilisateur est déjà login , on le redirige directement
	if (req.session.loggedin)
		return res.redirect(redirectURL);
	res.sendFile(path.resolve('./Client/relogin.html'));
});

app.post('/relogin', (req, res) =>
{
	if (req.body === undefined || req.body === '' || req.body === null)
		return erreur(res, "Erreur, aucune donnée reçue.", 400);

	var options = {
		url: "https://www.google.com/recaptcha/api/siteverify",
		method: 'POST',
		form: {
			"secret": "6LfMrOIUAAAAAOA9uLD5ix5T4AFPa28INJbsXkFv",
			"response": req.body["g-recaptcha-response"]
		}
	};
	request(options, function (error, response, body)
	{
		if (!error && response.statusCode == 200)
		{
			let result = JSON.parse(body);
			if (result["success"])
			{
				req.session.loggedin = true;
				req.session.compteur = 0;
				res.redirect("./create");
			}
			else
				erreur(res, "Captcha invalide", 401);
		}
	});
});

app.get("/play", (req, res) =>
{
	//#region verification
	if (!req.session.loggedin) return res.redirect("/login?red=play?token=" + req.query.token);//si on est pas enregistré
	let iPartie = -1;
	for (let i = 0; i < parties.length; i++)//on cherche la partie
	{
		if (parties[i].token === req.query.token)//si on trouve la partie qu'il recherche
			iPartie = i;
	}
	if (iPartie === -1)//si on a pas trouvé la partie on fout une erreur
		return erreur(res, "La partie que vous essayez de rejoindre n'existe pas", 404);

	let partie = parties[iPartie];
	//maitenant qu'on a trouvé la partie il serait judicieux de savoir si il (le mec qui fait la requête) est dedans
	let iJoueur = -1;
	for (let i = 0; i < partie.joueurs.length; i++)
	{
		const joueur = partie.joueurs[i];
		if (joueur.clientID === req.session.id)//si il a le même id qu'un joueur qui est dans la partie
			iJoueur = i;
	}
	if (iJoueur === -1) return erreur(res, "Cette partie a commencé sans vous", 410);
	//#endregion
	res.render("inGame.ejs", { adresse: domaineName, "nbJeux": partie.nbJeux, "admin": partie.joueurs[0].clientID === req.session.id });
});

app.post("/error", (req, res) =>
{
	let msg = req.body.msg;
	let code = parseInt(req.body.code);
	return erreur(res, msg, code);
});
app.post("/win", (req, res) =>
{
	let nb = req.body.nb;
	let couleur = req.body.couleur;
	res.render("win.ejs", { "nb": nb, "couleur": couleur });

});
app.use(function (req, res)
{
	erreur(res, "La page demandée n'existe pas", 404);
});

//les erreurs du serveurs => erreur 500 pr le client
app.use(function (error, req, res, next)
{
	console.error(error);
	erreur(res, "Une erreur à eu lieu coté serveur", 500);
});


//#endregion

//#region socket
io.on("connection", function (socket)
{
	socket.on("joinGame", (gameToken) =>
	{
		if (!socket.handshake.session.loggedin)
			return socket.emit("clientError", "Vous n'êtes pas connecté");

		let iPartie = -1;
		for (let i = 0; i < parties.length; i++)
		{
			const partie = parties[i];
			if (partie.token === gameToken)
				iPartie = i;
		}
		if (iPartie === -1)//si on a pas trouvé la partie
		{
			socket.emit("clientError", "La partie n'existe pas :'(");
			return;
		}
		if (!parties[iPartie].waiting) return;//si la partie n'accepte plus de joueurs on quitte la fonction
		//si la partie qu'il essaye de rejoindre existe et qu'il y est pas on l'ajoute
		let iJoueur = -1;

		for (let i = 0; i < parties[iPartie].joueurs.length; i++)
		{
			const joueur = parties[iPartie].joueurs[i];
			if (joueur.clientID === socket.handshake.session.id)//si on trouve le client on retiens sa position dans le tableau
				iJoueur = i;
		}
		if (iJoueur === -1)//si on l'as pas trouvé on l'ajoute
		{
			socket.handshake.session.gameToken = parties[iPartie].token;

			parties[iPartie].addPlayer(new Joueur(socket.handshake.session.id, socket.handshake.session.pseudo), io.sockets.connected);

			if (parties[iPartie].isPublic)//si la partie vient de commencer et qu'elle est publique
			{
				const nbJoueurs = debug ? 2 : 5;
				if (parties[iPartie].joueurs.length === 1)
					parties[iPartie].startSoon(io.sockets.connected);
				if (parties[iPartie].joueurs.length >= nbJoueurs)	//si y'a 5 joueurs au moins on commence la partie (2 en mode debug)
				{
					console.log("Y'a assez de monde, on commence");
					parties[iPartie].start(io.sockets.connected);
				}
			}
			//on dit à tous les gens qui sont connectés et qui sont dans la même partie que y'a un joueur en plus
		}
	});
	socket.on("disconnect", (raison) =>
	{
		//il faut savoir si le client qui vient de se déconnecter était dans une partie
		const gameToken = socket.handshake.session.gameToken;
		const gameId = gameIDFromToken(gameToken);
		if (gameToken === undefined || gameId === -1) return;

		if (parties[gameId] === undefined) return;//si qlq vient de quitter une partie qui n'existe plus

		let iClientRemove = -1;
		for (let i = 0; i < parties[gameId].joueurs.length; i++)
		{
			if (parties[gameId].joueurs[i].clientID === socket.handshake.session.id)//quand on trouve le client parmis tous les joueurs de la partie
			{
				iClientRemove = i;
				break;
			}
		}

		if (parties[gameId].joueurs[iClientRemove] === undefined) return;//si le client est déjà plus dans la partie
		if (parties[gameId].joueurs[iClientRemove].isLeaving === true)//si il quitte mais que c'est parce que la partie a commencé et qu'il va revenir
		{
			parties[gameId].joueurs[iClientRemove].isLeaving = false;//il a pas le droit de redéconnecter, ct juste pour changer de page
			return;
		}
		let adminLeft = false;
		if (iClientRemove != -1)//normalement c'est toujours vrai (si on a trouvé le client qui vient de quitter dans la partie qu'il vient de quitter) mais dans le doute
			parties[gameId].removePlayer(iClientRemove, io.sockets.connected);//on enlève le client
		else
			return;//quand ça fait ça c'est bizarre

		//si qlq quitte après que la partie a commencé on update les clients différement que si la partie a pas commencé
		//si c'est le dernier joueur qui a quitté on supprime la partie
		if (parties[gameId].joueurs.length > 0)
		{
			if (parties[gameId].waiting === false)//si la partie a commencé
				parties[gameId].updateGame(io.sockets.connected);
			else
				parties[gameId].updateGameNotStarted(io.sockets.connected);
		}
		else
		{
			console.log("Le dernier joueur de la partie vient de la quitter, elle est supprimée");
			parties[gameId].destruct();
			parties.splice(gameId, 1);
		}


	});
	socket.on("kickPlayer", (index) =>
	{
		const partieToBan = gameIDFromToken(socket.handshake.session.gameToken);
		if (partieToBan === -1) return;//si la partie avec ce token a pas été trouvé
		if (!socket.handshake.session.loggedin) return;//si c'est quelqu'un de pas connecté qui fait la requête alors osef
		if (parties[partieToBan] === undefined) return console.error("Pb");
		if (parties[partieToBan].joueurs[0].clientID != socket.handshake.session.id) return;//si c'est pas l'admin (= le premier joueur de la partie) qui fait la requête alors osef
		if (parties[partieToBan].joueurs[index] === undefined) return; //si le joueur à ban n'existe pas
		//maintenant on le ban (il pourra pas revenir dans la partie) puis on lui envoie un message pour lui dire qu'il a été kick

		let everySocket = io.sockets.connected;
		for (sName in everySocket)
		{
			if (everySocket[sName].handshake.session.gameToken === parties[partieToBan].token)//si il est dans la partie
			{
				if (everySocket[sName].handshake.session.id === parties[partieToBan].joueurs[index].clientID)//si le current socket est celui du joueur a ban, dans la partie a ban
					everySocket[sName].emit("clientError", "Vous avez été exclus de la partie");
			}
		}
		parties[partieToBan].ban(index, io.sockets.connected);
	});
	socket.on("startGame", () =>
	{
		if (!socket.handshake.session.loggedin) return console.log("Il est pas login");//si il est pas login on s'en moque de ce qu'il dit
		const partieToStart = parties[gameIDFromToken(socket.handshake.session.gameToken)];
		if (partieToStart === undefined) return console.log(parties);

		if (socket.handshake.session.id != partieToStart.joueurs[0].clientID) return;//si c'est pas l'admin il a pas le droit de faire ça donc on l'écoute pas

		if (!debug)
		{
			if (partieToStart.joueurs.length === 1) return;
		}
		partieToStart.start(io.sockets.connected);
	});
	socket.on("readyToDistribue", () =>
	{
		//#region verification
		if (!socket.handshake.session.loggedin) return;//si il est pas login on s'en moque de ce qu'il dit
		const partie = parties[gameIDFromToken(socket.handshake.session.gameToken)];
		if (partie === undefined) return;
		if (partie.compteurPret === null) return;
		//#endregion
		partie.compteurPret++;
		if (partie.compteurPret === partie.joueurs.length)
		{
			partie.distribue(io.sockets.connected);
		}

	});
	socket.on("rangerFini", (jeuPlayer) =>
	{
		let session = socket.handshake.session;
		if (!session.loggedin) return;
		let partie = parties[gameIDFromToken(session.gameToken)];
		if (partie === undefined) return;

		if (partie.startRange === null) return;
		let now = new Date();
		if (now.getTime() - partie.startRange.getTime() > partie.timeToRange) return;//si le temps est dépassé
		if (!partie.belongToPlayerDebut(session.id, jeuPlayer)) return;//si il peut pas avoir ce jeu (il a changé la valeur de ses cartes)
		let joueur = partie.findPlayer(session.id);
		if (joueur === null) return;
		if (joueur.hasRange) return;
		//si tout va bien on remplace le jeu du joueur par celui reçu
		joueur.jeu["perso"] = jeuPlayer["perso"];
		joueur.jeu["ouvert"] = jeuPlayer["ouvert"];
		joueur.hasRange = true;
		partie.nbJoueurRange++;
		partie.updateGame(io.sockets.connected);
		if (partie.nbJoueurRange === partie.joueurs.length)//quand tout le monde a fini plus personne peut ranger ses cartes
			partie.rangerOver(io.sockets.connected);
	});
	socket.on("playing", (cartesPlayed) =>
	{
		let session = socket.handshake.session;
		if (!session.loggedin) return;
		let partie = parties[gameIDFromToken(session.gameToken)];
		if (partie === undefined) return;//si la partie existe plus
		if (!Array.isArray(cartesPlayed)) return;//si c'est pas un tableau
		if (cartesPlayed.length > 4 || cartesPlayed.length === 0) return;//si c'est un tableau trop grand
		for (let i = 0; i < cartesPlayed.length; i++)
		{
			if (typeof cartesPlayed[i] != "object") return;//si y'a des éléments du tableau qui sont pas des objets
		}
		let result = partie.allowToPlay(session.id, cartesPlayed);//si c'est à lui de jouer et qu'il a mis que des cartes qui existent et de même valeur 
		if (result === false) return;
		if (!partie.canPlayThat(cartesPlayed)) return;
		if (!partie.belongToPlayer(session.id, cartesPlayed)) return;
		partie.gameLoop(cartesPlayed, io.sockets.connected);
	});
	socket.on("playingHidden", (index) =>
	{
		let session = socket.handshake.session;
		if (!session.loggedin) return;
		let partie = parties[gameIDFromToken(session.gameToken)];
		if (partie === undefined) return;//si la partie existe plus
		if (typeof index != "number") return;
		let joueur = partie.joueurs[partie.iJoueurPlaying];
		if (joueur.jeu["perso"].length > 0 || joueur.jeu["ouvert"].length > 0) return;//il peut pas jouer si il lui reste au moins une carte dans son jeu opublic ou perso
		let taille = joueur.jeu["cache"].length;
		if (index > taille - 1 || index < 0) return;//l'index est sensé désigner une carte du jeu caché
		partie.playHidden(index, io.sockets.connected);
	});
	socket.on("sendMsg", (msg) =>
	{
		let message = msg;
		if (typeof message != "string") return;
		if (message.length > 150 || message.length === 0) return;
		let session = socket.handshake.session;
		if (!session.loggedin) return;
		let gameId = gameIDFromToken(session.gameToken);
		if (gameId === -1) return;//on trouve pas la partie de ce joueur
		let partie = parties[gameId];
		if (partie === undefined) return;
		message = sanitizer.escape(message);
		partie.sendMsg(msg, session.id, io.sockets.connected);
	});
});
//#endregion

function erreur(res, msg, code)
{
	res.status(code).render("error.ejs", { "message": msg, "code": code });
}


function gameIDFromToken(token)
{
	let index = -1;
	for (let i = 0; i < parties.length; i++)
	{
		if (parties[i].token === token)
			index = i;
	}
	return index;
}
server.listen(8080);