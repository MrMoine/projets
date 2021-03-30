if (isCode)
{
    anime.timeline({ loop: false })
        .add({
            targets: '#code',
            textContent: [0, code],
            round: 1,
            duration: 1000,
            easing: "easeInOutCubic",
        }).add({
            targets: "#bouche",
            rotate: 180,
            translateY: -200,
            duration: 600,
            easing: "linear"
        }).add({
            targets: "#amDyWMaJW",
            scale: [0, 1],
            duration: 500,
            easing: "linear"
        });
}
else
{
    anime.timeline({ loop: false })
        .add({
            targets: "#bouche",
            rotate: 180,
            translateY: -200,
            duration: 600,
            easing: "linear"
        }).add({
            targets: "#amDyWMaJW",
            scale: [0, 1],
            duration: 500,
            easing: "linear"
        });
}