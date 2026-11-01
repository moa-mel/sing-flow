export interface HymnOptions {
  baseUrl: string;
}


export interface ExternalHymn {
    ID: number;
    Number: number;
    Title: string;
    Author?: string | null;
    Category?: number;
    CategoryName?: string;
    Lyrics?: {
        label: string;
        text: string;
    }[];
}