export interface CollectibleItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'personality' | 'hobby' | 'background' | 'skill';
  title: string;
  message: string;
  points: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'platform' | 'castle' | 'tree';
}

export interface Level {
  platforms: Platform[];
  collectibles: CollectibleItem[];
}

export const levels: Level = {
  platforms: [
    // Ground platforms
    { x: 0, y: 550, width: 300, height: 50, type: 'ground' },
    { x: 400, y: 500, width: 200, height: 20, type: 'platform' },
    { x: 700, y: 450, width: 150, height: 20, type: 'platform' },
    { x: 950, y: 400, width: 200, height: 20, type: 'platform' },
    { x: 1250, y: 350, width: 150, height: 20, type: 'platform' },
    { x: 1500, y: 300, width: 250, height: 100, type: 'castle' },
    { x: 1850, y: 450, width: 100, height: 80, type: 'tree' },
    { x: 2000, y: 550, width: 300, height: 50, type: 'ground' },
    { x: 2400, y: 500, width: 150, height: 20, type: 'platform' },
    { x: 2650, y: 450, width: 100, height: 20, type: 'platform' },
    { x: 2850, y: 400, width: 200, height: 100, type: 'castle' }, // Final castle
    
    // Additional platforms for challenging jumps
    { x: 300, y: 400, width: 80, height: 15, type: 'platform' },
    { x: 600, y: 350, width: 80, height: 15, type: 'platform' },
    { x: 1100, y: 250, width: 100, height: 15, type: 'platform' },
    { x: 1800, y: 200, width: 120, height: 15, type: 'platform' },
    { x: 2200, y: 350, width: 80, height: 15, type: 'platform' },
    { x: 2550, y: 300, width: 80, height: 15, type: 'platform' },
  ],

  collectibles: [
    // Personality traits - well placed on accessible platforms
    {
      id: 'extroverted',
      x: 320, y: 370, width: 20, height: 20,
      type: 'personality',
      title: 'Extroverted Nature',
      message: "🎉 I'm extroverted and love social events! I'm always up for a good time and enjoy meeting new people from different backgrounds.",
      points: 100
    },
    {
      id: 'openminded',
      x: 620, y: 320, width: 20, height: 20,
      type: 'personality',
      title: 'Open-Minded',
      message: "🌍 I'm open-minded and always excited to try new things! Whether it's board games or dancing at parties, I'm in!",
      points: 100
    },
    {
      id: 'respectful',
      x: 970, y: 370, width: 20, height: 20,
      type: 'personality',
      title: 'Respectful Living',
      message: "🤝 I deeply value respect and cleanliness in shared spaces. Good sleep is sacred, especially during uni grind!",
      points: 100
    },

    // Background & Experience - strategically placed
    {
      id: 'romanian',
      x: 150, y: 520, width: 20, height: 20,
      type: 'background',
      title: 'Romanian Heritage',
      message: "🇷🇴 I'm from Romania (hence the Transylvania theme!). I bring rich cultural experiences and amazing traditional recipes!",
      points: 150
    },
    {
      id: 'usa_experience',
      x: 1120, y: 220, width: 20, height: 20,
      type: 'background',
      title: 'USA University Experience',
      message: "🇺🇸 I spent a year studying in the USA with shared dorms and roommates. I know how to navigate communal living successfully!",
      points: 150
    },
    {
      id: 'bit_student',
      x: 1600, y: 270, width: 20, height: 20,
      type: 'background',
      title: 'BIT Student at UT',
      message: "🎓 I'm a first-year Business Information Technology student at University of Twente. Ready to dive into Dutch student life!",
      points: 150
    },

    // Skills & Hobbies - better positioning
    {
      id: 'cooking',
      x: 750, y: 420, width: 20, height: 20,
      type: 'skill',
      title: 'Amazing Cook',
      message: "👨‍🍳 I can REALLY cook! Amazing pizza from scratch, pastries, and the best Romanian BBQ you'll ever taste. Ready to share!",
      points: 200
    },
    {
      id: 'gym',
      x: 1300, y: 320, width: 20, height: 20,
      type: 'hobby',
      title: 'Gym Enthusiast',
      message: "💪 I love going to the gym and staying active! Great way to stay healthy during the study grind.",
      points: 100
    },
    {
      id: 'debates',
      x: 1820, y: 170, width: 20, height: 20,
      type: 'hobby',
      title: 'Love Good Debates',
      message: "🗣️ I'm a huge fan of respectful debates and deep discussions. Love exchanging ideas over drinks or late-night kitchen chats!",
      points: 100
    },

    // Living qualities - improved placement
    {
      id: 'routine',
      x: 450, y: 470, width: 20, height: 20,
      type: 'personality',
      title: 'Good Routines',
      message: "⏰ I keep solid routines and believe in the importance of good sleep. I balance social fun with responsible study habits!",
      points: 100
    },
    {
      id: 'social_balance',
      x: 2220, y: 320, width: 20, height: 20,
      type: 'personality',
      title: 'Social Balance',
      message: "⚖️ I know how to balance fun social times with quiet study periods. Respect for everyone's needs is key!",
      points: 100
    },
    {
      id: 'cultural_exchange',
      x: 2570, y: 270, width: 20, height: 20,
      type: 'background',
      title: 'Cultural Bridge',
      message: "🌉 Having lived in Romania and the USA, I love being a cultural bridge and sharing different perspectives with housemates!",
      points: 150
    }
  ]
};
