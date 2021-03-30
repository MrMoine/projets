function randomIntFromInterval(min, max)
{
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function randomFloatFromInterval(min, max)
{
    return Math.random() * (max - min + 1) + min;
}
const canvas = document.getElementById("container");
const context = canvas.getContext("2d");
const height = window.innerHeight;
const width = window.innerWidth;
const gravite = -0.01;
canvas.width = width;
canvas.height = height;

let objects = [];

class Boule
{
    constructor(x, y, rayon,vitesse)
    {
        this.position = { "x": x, "y": y };
        this.vitesse = vitesse;
        this.rayon = rayon;

        this.r = randomIntFromInterval(50, 255);
        this.g = randomIntFromInterval(50, 255);
        this.b = randomIntFromInterval(50, 255);
        this.isHere = true;
        setTimeout(() => {
            this.isHere = false;
        }, 2000);
    }
    update()
    {
        this.vitesse.y -= gravite;
        this.position.x += this.vitesse.x;
        this.position.y += this.vitesse.y;
        console.log(this.vitesse.x);
        context.fillStyle = "rgb(" + String(this.r) + "," + String(this.g) + "," + String(this.b) + ")";
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.rayon, 0, 2 * Math.PI);
        context.fill();
    }
}

class Fusee
{
    constructor(x, y)
    {
        this.position = { "x": x, "y": y };
        this.vitesse = { "x": 0, "y": -2 };
        this.r = randomIntFromInterval(50, 255);
        this.g = randomIntFromInterval(50, 255);
        this.b = randomIntFromInterval(50, 255);
        this.hauteurBoom = randomIntFromInterval(0, height / 2);
        this.isHere = true;
    }
    update()
    {
        this.vitesse.y += -0.03;
        this.position.y += this.vitesse.y;
        if (this.hauteurBoom >= this.position.y)
        {
            for (let i = 0; i < 50; i++)
            {
                let vitesseX = randomFloatFromInterval(-3, 3);
                let vitesseY = randomFloatFromInterval(-2, 2
                );
                objects.push(new Boule(this.position.x, this.position.y, 5, { "x": vitesseX, "y": vitesseY }));
            }
            this.isHere = false;
        }
        context.fillStyle = "rgb(" + String(this.r) + "," + String(this.g) + "," + String(this.b) + ")";
        context.beginPath();
        context.arc(this.position.x, this.position.y, 5, 0, 2 * Math.PI);
        context.fill();
    }
}

setInterval(() =>
{
    context.fillStyle = "rgba(255,255,255,0.1 )";
    context.beginPath();
    context.rect(0, 0, width, height);
    context.fill();
    for (let i = 0; i < objects.length; i++)
    {
        objects[i].update();
    }
    objects = objects.filter(item => item.isHere === true);
    
}, 16.6);//(à peu près 60FPS)

setInterval(() => {
    objects.push(new Fusee(randomIntFromInterval(0, width),height));
}, 1000);