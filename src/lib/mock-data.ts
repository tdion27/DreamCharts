import type { Song } from "./types";
import { placeholderImages } from "./placeholder-images.json";

const artists = ["The Midnight", "St. Lucia", "CHVRCHES", "LANY", "The 1975", "M83", "Gunship", "FM-84", "Bleachers", "Carly Rae Jepsen"];
const titles = ["Sunset", "Elevate", "Clearest Blue", "ILYSB", "Somebody Else", "Midnight City", "Tech Noir", "Running in the Night", "I Wanna Get Better", "Run Away With Me"];

const generateSongs = (count: number, startRank: number = 1): Song[] => {
  const songs: Song[] = [];
  for (let i = 0; i < count; i++) {
    const rank = startRank + i;
    const previousRank = Math.random() > 0.5 ? rank + Math.floor(Math.random() * 5) - 2 : null;
    let change: 'up' | 'down' | 'new' | 'same' = 'same';
    if (previousRank === null) {
      change = 'new';
    } else if (rank < previousRank) {
      change = 'up';
    } else if (rank > previousRank) {
      change = 'down';
    }
    
    songs.push({
      rank: rank,
      title: titles[i % titles.length] + (i > 10 ? ` Remix ${i}` : ''),
      artist: artists[i % artists.length],
      albumArtUrl: placeholderImages[i % placeholderImages.length]?.imageUrl || `https://picsum.photos/seed/${rank}/100/100`,
      playcount: Math.floor(Math.random() * (100 - 20 + 1)) + 20,
      change: change,
      previousRank: previousRank,
    });
  }
  return songs;
};

export const mockInitialChart: Song[] = generateSongs(20);
