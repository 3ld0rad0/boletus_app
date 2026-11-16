import type { IconName } from '../components/Icon'
import { SPECIES_INFO, type Photo } from './speciesInfo'

export interface Tip {
  title: string
  text: string
  /** Foto, con autore e licenza da mostrare. */
  photo?: Photo
  icon: IconName
}

const lookalikePhoto = (speciesId: string, latinName: string) =>
  SPECIES_INFO[speciesId]?.lookalikes.find((l) => l.latinName === latinName)?.photo

/** Frasi scherzose che si alternano sotto la barra di caricamento. */
export const QUIPS: string[] = [
  'Sto raccogliendo porcini freschi…',
  'Annuso il sottobosco…',
  'Cerco il muschio giusto…',
  'Conto le gocce di pioggia…',
  'Metto gli scarponi…',
  'Spazzolo i gambi dei finferli…',
  'Chiedo ai ricci dove sono i funghi…',
  'Interrogo le nuvole…',
  'Scruto sotto le foglie di castagno…',
  'Affilo il coltellino…',
  'Misuro l’umidità con il naso…',
  'Seguo l’odore di bosco umido…',
  'Sto svuotando il cestino…',
]

/** Consigli che scorrono durante il caricamento iniziale; le foto sono quelle delle schede delle specie. */
export const TIPS: Tip[] = [
  {
    title: 'Porcino: guarda sotto il cappello',
    text: 'Ha pori, non lamelle, e un sottile reticolo chiaro sul gambo. La carne resta bianca al taglio.',
    photo: SPECIES_INFO.porcino?.photo,
    icon: 'mushroom',
  },
  {
    title: 'Attenzione ai sosia',
    text: 'Il boleto di Satana ha pori rossi e la carne vira all’azzurro al taglio: non va mai raccolto.',
    photo: lookalikePhoto('porcino', 'Rubroboletus satanas'),
    icon: 'warning',
  },
  {
    title: 'Dopo la pioggia',
    text: 'I funghi compaiono di solito dopo alcuni giorni di pioggia seguiti da temperature miti: per questo Boletus guarda il meteo degli ultimi 10 giorni.',
    icon: 'cloud',
  },
  {
    title: 'Finferlo o fungo dell’olivo?',
    text: 'Il finferlo cresce sul terreno e profuma di albicocca; il fungo dell’olivo, velenoso, forma ciuffi su ceppi e radici.',
    photo: lookalikePhoto('finferlo', 'Omphalotus olearius'),
    icon: 'warning',
  },
  {
    title: 'Cestino, non sacchetti',
    text: 'Un cestino rigido e aerato mantiene integri i funghi e lascia cadere le spore lungo il percorso.',
    icon: 'check',
  },
  {
    title: 'Mazza di tamburo',
    text: 'Gambo a “pelle di serpente” e anello mobile. Si mangia solo il cappello, ben cotto.',
    photo: SPECIES_INFO['mazza-di-tamburo']?.photo,
    icon: 'mushroom',
  },
  {
    title: 'Raccogli il fungo intero',
    text: 'Non lasciare la base del gambo: serve per riconoscere i caratteri importanti, come la volva delle amanite mortali.',
    icon: 'info',
  },
  {
    title: 'Fai sempre controllare il raccolto',
    text: 'Boletus non identifica i funghi: porta il raccolto a un micologo o all’ispettorato micologico della tua ASL.',
    icon: 'warning',
  },
  {
    title: 'Rispetta le regole locali',
    text: 'Permessi, quantità, giorni e orari di raccolta cambiano da regione a regione: informati prima di partire.',
    icon: 'info',
  },
  {
    title: 'Non andare allo sbaraglio',
    text: 'Avvisa qualcuno di dove vai e porta con te una mappa cartacea e una bussola: il GPS può mancare.',
    icon: 'flag',
  },
]
