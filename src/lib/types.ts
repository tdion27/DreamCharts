export type ClientSong = {
  rank: number;
  title: string;
  artist: string;
  albumArtUrl: string;
  score: number;
  totalPlaycount: number;
  playcounts: { [user: string]: number };
  change: "up" | "down" | "new" | "same";
  previousRank: number | null;
};

export interface ChartTrack {
    trackName: string;
    artistName: string;
    position: number;
    playCount: number; 
    score: number;
    totalPlaycount: number;
    playcounts: { [user: string]: number };
    albumArtUrl: string;
}

export interface WeeklyChart {
    id: string;
    chartName: string;
    startDate: string; 
    endDate: string; 
    ownerId: string;
    accounts: string[];
    tracks: ChartTrack[];
}


// Types for Last.fm API response
export interface LastfmImage {
    '#text': string;
    size: 'small' | 'medium' | 'large' | 'extralarge' | '';
}

export interface LastfmTrack {
    name: string;
    artist: {
        name:string;
    };
    playcount: string;
    image: LastfmImage[];
}

export interface LastfmTrackInfo {
    name: string;
    artist: {
        name: string;
    };
    album?: {
        title: string;
        image: LastfmImage[];
    }
}
