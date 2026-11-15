import type { Place } from '@/services/geocoding';
import type { PlacePhoto } from '@/services/wiki';

export const THEMES = ['city', 'beach', 'hills', 'heritage'] as const;
export type Theme = (typeof THEMES)[number];

export type Destination = Place & { theme: Theme; photo: PlacePhoto };

const COMMONS = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';

/**
 * Featured destinations. Each photo is the lead image of the place's Wikipedia
 * article, recorded with its author and licence (looked up on 14 Nov 2026) so
 * it can be credited wherever it appears. Files are served by Wikimedia.
 */
function destination(
  slug: string,
  name: string,
  country: string,
  countryCode: string,
  lat: number,
  lng: number,
  timezone: string,
  theme: Theme,
  file: string, // "<hash>/<encoded file name>" on Wikimedia Commons
  original: [number, number],
  credit: string,
  license: string,
  base = COMMONS,
): Destination {
  const name500 = file.slice(file.lastIndexOf('/') + 1);
  const page = base === COMMONS ? 'https://commons.wikimedia.org' : 'https://en.wikipedia.org';
  return {
    id: `cur:${slug}`,
    source: 'curated',
    name,
    country,
    countryCode,
    lat,
    lng,
    timezone,
    theme,
    photo: {
      url: `${base}/${file}/500px-${name500}`,
      width: original[0],
      height: original[1],
      credit,
      license,
      sourceUrl: `${page}/wiki/File:${name500}`,
    },
  };
}

export const DESTINATIONS: Destination[] = [
  destination('kuala-lumpur', 'Kuala Lumpur', 'Malaysia', 'MY', 3.139, 101.6869, 'Asia/Kuala_Lumpur', 'city', '1/1a/Bukit_Bintang_junction_in_2024_2.jpg', [4000, 2252], 'Renek78', 'CC0'),
  destination('alappuzha', 'Alappuzha', 'India', 'IN', 9.4981, 76.3388, 'Asia/Kolkata', 'beach', 'e/e4/Alappuzha_Boat_Beauty_W.jpg', [2500, 1656], 'Augustus Binu', 'CC BY-SA 3.0'),
  destination('munnar', 'Munnar', 'India', 'IN', 10.0889, 77.0595, 'Asia/Kolkata', 'hills', 'b/b9/Munnar_Overview.jpg', [4873, 3249], 'Kondephy', 'CC BY-SA 4.0'),
  destination('langkawi', 'Langkawi', 'Malaysia', 'MY', 6.35, 99.8, 'Asia/Kuala_Lumpur', 'beach', '6/6c/Eagle_square_at_Kuah_Langkawi.jpg', [5472, 3648], 'Ttt.Osakanman', 'CC BY-SA 4.0'),
  destination('cameron-highlands', 'Cameron Highlands', 'Malaysia', 'MY', 4.5, 101.5, 'Asia/Kuala_Lumpur', 'hills', '0/06/Tea_fields_%28Will_Ellis%29.jpg', [2816, 2112], 'Will Ellis', 'CC BY 2.0'),
  destination('jaipur', 'Jaipur', 'India', 'IN', 26.9124, 75.7873, 'Asia/Kolkata', 'heritage', '4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg', [3345, 2509], 'Chainwit.', 'CC BY-SA 4.0'),
  destination('kochi', 'Kochi', 'India', 'IN', 9.9312, 76.2673, 'Asia/Kolkata', 'city', '8/8f/Kochi_Skyline.jpg', [1200, 800], 'Fsquares (The Ibrahims)', 'CC BY-SA 4.0'),
  destination('george-town', 'George Town', 'Malaysia', 'MY', 5.4141, 100.3288, 'Asia/Kuala_Lumpur', 'heritage', '6/65/Skyline_of_George_Town%2C_Penang_at_night_Nov2024-29-17.jpg', [7994, 4496], 'HundenvonPenang', 'CC BY-SA 4.0'),
  destination('goa', 'Goa', 'India', 'IN', 15.2993, 74.124, 'Asia/Kolkata', 'beach', 'f/fc/BeachFun.jpg', [4640, 2610], 'Sam 8393', 'CC BY-SA 4.0'),
  destination('ooty', 'Ooty', 'India', 'IN', 11.41, 76.7, 'Asia/Kolkata', 'hills', 'd/db/Ooty_lake.jpg', [2442, 1329], 'Vinayaraj', 'CC BY-SA 3.0'),
  destination('hampi', 'Hampi', 'India', 'IN', 15.3344, 76.4622, 'Asia/Kolkata', 'heritage', 'd/dd/Wide_angle_of_Galigopuram_of_Virupaksha_Temple%2C_Hampi_%2804%29_%28cropped%29.jpg', [6000, 3000], 'iMahesh', 'CC BY-SA 4.0'),
  destination('malacca', 'Malacca City', 'Malaysia', 'MY', 2.1896, 102.2501, 'Asia/Kuala_Lumpur', 'heritage', '7/7a/Melaka_View.jpg', [5312, 2988], 'Atlasmotor', 'CC BY-SA 4.0'),
  destination('tokyo', 'Tokyo', 'Japan', 'JP', 35.6762, 139.6503, 'Asia/Tokyo', 'city', 'b/b2/Skyscrapers_of_Shinjuku_2009_January.jpg', [2560, 1364], 'Morio', 'CC BY-SA 3.0'),
  destination('paris', 'Paris', 'France', 'FR', 48.8566, 2.3522, 'Europe/Paris', 'city', '4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg', [4592, 2870], 'Yann Caradec', 'CC BY-SA 2.0'),
  destination('dubai', 'Dubai', 'United Arab Emirates', 'AE', 25.2048, 55.2708, 'Asia/Dubai', 'city', 'c/c7/Burj_Khalifa_2021.jpg', [5854, 4049], 'Francisco Anzola', 'CC BY 2.0', 'https://thumb.wikimedia.org/wikipedia/en/thumb'),
  destination('cape-town', 'Cape Town', 'South Africa', 'ZA', -33.9249, 18.4241, 'Africa/Johannesburg', 'beach', '8/8d/Camps_bay_%2853460319478%29_%28cropped%29.jpg', [5400, 3120], 'Der Berzerker', 'CC BY-SA 2.0'),
  destination('sydney', 'Sydney', 'Australia', 'AU', -33.8688, 151.2093, 'Australia/Sydney', 'city', '5/53/Sydney_Opera_House_and_Harbour_Bridge_Dusk_%282%29_2019-06-21.jpg', [6173, 3087], 'Benh LIEU SONG', 'CC BY-SA 4.0'),
  destination('london', 'London', 'United Kingdom', 'GB', 51.5072, -0.1276, 'Europe/London', 'city', '6/67/London_Skyline_%28125508655%29.jpeg', [2048, 1152], 'Ilya Grigorik', 'CC BY-SA 3.0'),
  destination('new-york', 'New York', 'United States', 'US', 40.7128, -74.006, 'America/New_York', 'city', '7/7a/View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%28cropped%29.jpg', [8207, 4616], 'Dllu', 'CC BY-SA 4.0'),
  destination('cairo', 'Cairo', 'Egypt', 'EG', 30.0444, 31.2357, 'Africa/Cairo', 'heritage', '7/7a/Cairo%E2%80%99s_Qasr_El_Nil_Bridge.jpg', [2003, 983], 'سها القاضي', 'CC0'),
  destination('kyoto', 'Kyoto', 'Japan', 'JP', 35.0116, 135.7681, 'Asia/Tokyo', 'heritage', 'a/ae/Kiyomizu-dera%2C_Kyoto%2C_November_2016_-02.jpg', [5659, 3738], 'Martin Falbisoner', 'CC BY-SA 4.0'),
  destination('shimla', 'Shimla', 'India', 'IN', 31.1033, 77.1722, 'Asia/Kolkata', 'hills', 'b/ba/Landscape_of_Shimla_%2C_Himachal_Pradesh.jpg', [6048, 4024], 'Navneet Sharma', 'CC BY-SA 4.0'),
  destination('kodaikanal', 'Kodaikanal', 'India', 'IN', 10.23, 77.48, 'Asia/Kolkata', 'hills', 'd/da/Boating_in_Kodaikanal_Lake_with_Mist.jpg', [5184, 3456], 'KARTY JazZ', 'CC BY-SA 4.0'),
  destination('darjeeling', 'Darjeeling', 'India', 'IN', 27.0375, 88.2631, 'Asia/Kolkata', 'hills', '9/96/DarjeelingTrainFruitshop_%282%29.jpg', [3093, 2021], 'Arne Hückelheim', 'CC BY-SA 4.0'),
  destination('varkala', 'Varkala', 'India', 'IN', 8.7433, 76.6968, 'Asia/Kolkata', 'beach', '4/49/Varkala_Beach%2C_Varkala%2C_Kerala.jpg', [1136, 752], 'Devender Goyal', 'CC BY-SA 4.0'),
]; // prettier-ignore

/** Wikimedia serves thumbnails only at a fixed set of widths. */
const WIDTHS = [250, 330, 500, 960, 1280, 1920] as const;

/** The same photo at (about) the requested width, never larger than the original. */
export function photoAt(photo: PlacePhoto, wanted: number): string {
  const allowed = WIDTHS.filter((width) => width <= photo.width);
  const width = allowed.find((candidate) => candidate >= wanted) ?? allowed.at(-1) ?? 500;
  return photo.url.replace(/\/\d+px-/, `/${width}px-`);
}

/** A featured destination matching a place the traveller picked, if there is one. */
export function findDestination(place: {
  name: string;
  countryCode: string;
}): Destination | undefined {
  return DESTINATIONS.find(
    (item) => item.countryCode === place.countryCode && item.name === place.name,
  );
}

/** Photos used for the large banners: wide, bright, recognisably "travel". */
export const BANNER_SLUGS = ['alappuzha', 'munnar', 'kuala-lumpur', 'cape-town', 'sydney'];
export const BANNERS = BANNER_SLUGS.map((slug) =>
  DESTINATIONS.find((item) => item.id === `cur:${slug}`),
).filter((item): item is Destination => Boolean(item));

/** A `srcset` for a photo, covering phone to desktop widths. */
export function photoSrcSet(photo: PlacePhoto): string {
  return WIDTHS.filter((width) => width >= 500 && width <= photo.width)
    .map((width) => `${photoAt(photo, width)} ${width}w`)
    .join(', ');
}
