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

socket.on("updateInfo", (infos) =>
{

    //changer ça fera pas de vous un admin, ça serait trop simple :D
    //la page vous affichera juste des boutons qui fonctionneront pas
    let admin = document.getElementById("isAdmin").getAttribute("data-isAdmin") === "true";
    if (infos.nbPlayer != undefined)//si le but de la requête était qu'on update le nb de joueurs il est défini sinon osef
    {
        document.getElementById("nbPlayer").textContent = String(infos.nbPlayer) + " joueurs";
        // console.log("on update le nombre de joueurs à " + String(infos.nbPlayer));
    }
    if (infos.pseudos instanceof Array)
    {
        let tableau = document.getElementById("joueursCo");
        tableau.innerHTML = "";
        let colonneInfos = document.createElement("tr");
        let ligneInfo = document.createElement("th");
        ligneInfo.textContent = "Joueurs :";
        colonneInfos.appendChild(ligneInfo);
        tableau.appendChild(colonneInfos);

        for (let i = 0; i < infos.pseudos.length; i++)
        {
            let ligne = document.createElement("tr");
            let colonne = document.createElement("td");
            colonne.textContent = infos.pseudos[i];
            ligne.appendChild(colonne);
            if (admin && i != 0)
            {
                let bouton = document.createElement("button");
                bouton.textContent = "Expulser ce joueur";
                bouton.onclick = () =>
                {
                    kickPlayer(i);
                };
                ligne.appendChild(bouton);
            }
            tableau.appendChild(ligne);
        }
    }
});

socket.on("gameStarted", () =>
{
    window.location.href = "./play" + window.location.search;
});
function kickPlayer(index)
{
    socket.emit("kickPlayer", index);
}

function startPartie() 
{
    socket.emit("startGame");
}

var clip = new ClipboardJS('#copyLink');