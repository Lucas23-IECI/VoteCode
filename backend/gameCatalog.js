export const minVotes = 3;

export const games = [
  {
    id: "rv-there-yet",
    name: "RV THERE YET",
    price: 3290,
    accent: "#19736f",
    image: "/assets/rv-there-yet.jpg",
  },
  {
    id: "sons-of-the-forest",
    name: "SONS OF THE FOREST",
    price: 4650,
    accent: "#263238",
    image: "/assets/sons-of-the-forest.jpg",
  },
  {
    id: "risk-of-rain-2",
    name: "RISK OF RAIN 2",
    price: 3960,
    accent: "#bd4f2f",
    image: "/assets/risk-of-rain-2.jpg",
  },
  {
    id: "plague-inc",
    name: "PLAGUE INC",
    price: 830,
    accent: "#566b2f",
    image: "/assets/plague-inc.jpg",
  },
  {
    id: "super-battle-golf",
    name: "SUPER BATTLE GOLF",
    price: 2800,
    accent: "#2f6fca",
    image: "/assets/super-battle-golf.jpg",
  },
  {
    id: "gamble-with-your-friends",
    name: "GAMBLE WITH YOUR FRIENDS",
    price: 2914,
    accent: "#8f3f97",
    image: "/assets/gamble-with-your-friends.jpg",
  },
  {
    id: "golf-with-your-friends",
    name: "GOLF WITH YOUR FRIENDS",
    price: 1190,
    accent: "#1f8a63",
    image: "/assets/golf-with-your-friends.jpg",
  },
  {
    id: "escape-the-backrooms",
    name: "ESCAPE THE BACKROOMS",
    price: 3384,
    accent: "#c99b38",
    image: "/assets/escape-the-backrooms.jpg",
  },
  {
    id: "gang-beasts",
    name: "GANG BEASTS",
    price: 4200,
    accent: "#d95d39",
    image: "/assets/gang-beast.jpg",
  },
  {
    id: "deathsprint-66",
    name: "DEATHSPRINT 66",
    price: 1925,
    accent: "#4657a8",
    image: "/assets/deathsprint-66.jpg",
  },
];

export const gameIds = new Set(games.map((game) => game.id));
