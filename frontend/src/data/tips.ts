import type { IconName } from '../components/Icon'
import { SPECIES_INFO, type Photo } from './speciesInfo'

export interface Tip {
  title: string
  text: string
  /** Foto; il credito (autore e licenza) si mostra solo se presente. */
  photo?: Pick<Photo, 'src'> & Partial<Photo>
  icon: IconName
}

const generic = (name: string) => ({ src: `/generic/${name}.jpg` })

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
    photo: generic('temporale'),
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
    photo: SPECIES_INFO.porcino?.photo,
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
  {
    title: 'Pulisci sul posto',
    text: 'Togli terra e aghi con un pennellino già nel bosco: il cestino resta pulito e le spore tornano al terreno.',
    icon: 'check',
  },
  {
    title: 'Lascia stare i funghi vecchi',
    text: 'Se sono molli, bucati dalle larve o imbevuti d’acqua si deteriorano in fretta e possono far male: non raccoglierli.',
    icon: 'warning',
  },
  {
    title: 'Lascia crescere i piccoli',
    text: 'I funghi appena nati non hanno ancora i caratteri per essere riconosciuti e pesano poco: segna il punto e torna tra qualche giorno.',
    photo: generic('nascite'),
    icon: 'clock',
  },
  {
    title: 'Mai assaggiare per riconoscere',
    text: 'Non masticare né assaggiare crudo un fungo per capire cos’è: alcune specie mortali hanno un sapore gradevole.',
    icon: 'warning',
  },
  {
    title: 'Amanita phalloides',
    text: 'Cappello verdastro, anello sul gambo e volva a sacco alla base: è la specie responsabile della maggior parte delle intossicazioni mortali.',
    photo: lookalikePhoto('ovolo', 'Amanita phalloides'),
    icon: 'warning',
  },
  {
    title: 'Attenzione ai falsi miti',
    text: 'Moneta d’argento, cipolla o aceto non rivelano un fungo velenoso. Che lo mangino le lumache non lo rende sicuro.',
    icon: 'warning',
  },
  {
    title: 'Cuoci sempre bene',
    text: 'Quasi tutti i funghi vanno consumati cotti a lungo: da crudi o poco cotti molte specie causano disturbi.',
    photo: SPECIES_INFO.chiodino?.photo,
    icon: 'info',
  },
  {
    title: 'Conservali con cura',
    text: 'In frigorifero, in un contenitore aerato e per pochi giorni. Mai in sacchetti di plastica chiusi: fermentano.',
    icon: 'clock',
  },
  {
    title: 'Non annegarli nell’acqua',
    text: 'I funghi assorbono acqua: meglio pulirli con un panno umido o uno spazzolino che lavarli a lungo.',
    icon: 'check',
  },
  {
    title: 'Cosa mettere nello zaino',
    text: 'Coltellino, spazzolino, cestino, acqua, qualcosa da mangiare, fischietto, telefono carico e una batteria di scorta.',
    icon: 'flag',
  },
  {
    title: 'Vestiti per il bosco',
    text: 'Pantaloni lunghi, scarponi e giacca antipioggia. In stagione di caccia indossa un capo ben visibile, meglio arancione.',
    icon: 'eye',
  },
  {
    title: 'Controlla le zecche',
    text: 'Dopo l’uscita ispeziona gambe, ascelle e cuoio capelluto: la zecca va rimossa presto con una pinzetta.',
    photo: generic('zecca'),
    icon: 'warning',
  },
  {
    title: 'Occhio alle vipere',
    text: 'In autunno sono ancora attive: porta scarponi alti, non infilare le mani tra sassi e cespugli e muoviti con un bastone.',
    photo: generic('vipera'),
    icon: 'warning',
  },
  {
    title: 'Vento e temporali',
    text: 'Con vento forte o temporali evita il bosco: i rami e le piante possono cadere senza preavviso.',
    photo: generic('temporale'),
    icon: 'cloud',
  },
  {
    title: 'Parti presto',
    text: 'Al mattino c’è meno gente, la luce è buona e hai tutto il giorno per tornare con calma prima del buio.',
    photo: generic('alba'),
    icon: 'sun',
  },
  {
    title: 'Esposizione dei versanti',
    text: 'Nelle annate asciutte cerca i versanti a nord, più umidi; con il fresco autunnale prova anche quelli a sud, più tiepidi.',
    photo: generic('alba'),
    icon: 'locate',
  },
  {
    title: 'Funghi e alberi sono alleati',
    text: 'Porcini e finferli vivono in simbiosi con le radici: cerca vicino a castagni, querce, faggi, abeti e pini.',
    photo: SPECIES_INFO.finferlo?.photo,
    icon: 'mushroom',
  },
  {
    title: 'Margini e radure',
    text: 'Spesso i funghi si trovano ai bordi di sentieri, radure e tagli del bosco, dove filtra più luce.',
    photo: SPECIES_INFO['mazza-di-tamburo']?.photo,
    icon: 'eye',
  },
  {
    title: 'Trovato uno? Guardati intorno',
    text: 'I funghi crescono spesso a gruppi: fermati e osserva con calma attorno al primo, e nelle zone vicine con le stesse condizioni.',
    photo: SPECIES_INFO.pinarolo?.photo,
    icon: 'search',
  },
  {
    title: 'Una settimana dopo la pioggia',
    text: 'Dopo una pioggia abbondante i funghi spuntano spesso nel giro di circa una settimana, se le temperature restano miti.',
    photo: generic('temporale'),
    icon: 'cloud',
  },
  {
    title: 'Chiodini: cottura obbligatoria',
    text: 'Vanno sempre cotti a lungo. Non confonderli con la galerina marginata, mortale: cresce su legno e ha un anello sul gambo.',
    photo: lookalikePhoto('chiodino', 'Galerina marginata'),
    icon: 'warning',
  },
  {
    title: 'Ovolo buono o ovolo malefico?',
    text: 'L’ovolo buono ha lamelle gialle e volva bianca a sacco; l’amanita muscaria ha lamelle bianche e cappello rosso a puntini.',
    photo: lookalikePhoto('ovolo', 'Amanita muscaria'),
    icon: 'warning',
  },
  {
    title: 'Prataiolo: guarda le lamelle',
    text: 'Quelle del prataiolo sono rosa e poi brune. Con lamelle bianche può essere un’amanita mortale; se ingiallisce alla base è tossico.',
    photo: generic('prataiolo'),
    icon: 'warning',
  },
  {
    title: 'Spugnole: sempre cotte',
    text: 'Hanno il cappello alveolato e completamente cavo dentro. Non confonderle con le false spugnole (Gyromitra), tossiche.',
    icon: 'mushroom',
  },
  {
    title: 'Porcino o porcino di fiele?',
    text: 'Il fungo amaro ha pori rosati e un reticolo scuro sul gambo; il porcino ha pori bianchi, poi giallo-olivastri.',
    photo: lookalikePhoto('porcino', 'Tylopilus felleus'),
    icon: 'mushroom',
  },
  {
    title: 'Boleti con pori rossi',
    text: 'Servono certezza assoluta e cottura prolungata: alcuni sono tossici se poco cotti, altri velenosi. Nel dubbio lasciali dove sono.',
    photo: lookalikePhoto('porcino', 'Rubroboletus satanas'),
    icon: 'warning',
  },
  {
    title: 'La sporata aiuta',
    text: 'Appoggia il cappello su un foglio per qualche ora: il colore delle spore è un carattere utile per identificarlo.',
    photo: generic('prataiolo'),
    icon: 'search',
  },
  {
    title: 'Tieni separati i dubbi',
    text: 'Metti i funghi incerti in uno scomparto a parte: un solo velenoso mescolato agli altri rovina il raccolto e il controllo.',
    icon: 'check',
  },
  {
    title: 'Lontano da strade e industrie',
    text: 'I funghi accumulano metalli pesanti e inquinanti: evita bordi stradali, discariche, aree industriali e campi trattati.',
    icon: 'warning',
  },
  {
    title: 'Controlla i limiti di raccolta',
    text: 'In molte regioni il limite è di 3 kg a persona al giorno: verifica quello della zona prima di partire.',
    icon: 'info',
  },
  {
    title: 'Serve un tesserino?',
    text: 'In molte regioni occorre un permesso o un tesserino, a volte a pagamento: ottienilo prima di partire.',
    icon: 'info',
  },
  {
    title: 'Parchi e riserve',
    text: 'Nelle aree protette la raccolta è spesso vietata o limitata: informati e rispetta i cartelli.',
    icon: 'flag',
  },
  {
    title: 'Non rastrellare il terreno',
    text: 'Rastrelli e vanghe rovinano il micelio. Dopo aver staccato il fungo copri il punto con foglie e terra.',
    icon: 'check',
  },
  {
    title: 'Boletus è una stima',
    text: 'Il punteggio indica quanto sono favorevoli le condizioni, non la certezza di trovare funghi: il bosco ha l’ultima parola.',
    icon: 'info',
  },
  {
    title: 'Come nasce il punteggio',
    text: 'Combina quota, stagione, meteo degli ultimi 10 giorni, vegetazione e distanza dai centri abitati.',
    icon: 'star',
  },
  {
    title: 'Salva il punto di partenza',
    text: 'Nel bosco è facile perdere l’orientamento: segna dove hai lasciato l’auto per ritrovare la strada.',
    icon: 'flag',
  },
  {
    title: 'Fotografa prima di raccogliere',
    text: 'Scatta il fungo nel suo ambiente, da sopra, di lato e sotto il cappello: ti aiuterà a farlo riconoscere dall’esperto.',
    photo: generic('nascite'),
    icon: 'eye',
  },
  {
    title: 'Non fidarti solo delle app',
    text: 'Le app di riconoscimento fotografico sbagliano: per mangiare un fungo serve sempre il parere di un micologo.',
    icon: 'warning',
  },
  {
    title: 'Se stai male dopo un pasto',
    text: 'Vai subito al pronto soccorso e porta gli avanzi o i residui: i sintomi tardivi, dopo 6–24 ore, sono i più pericolosi.',
    icon: 'warning',
  },
  {
    title: 'Coprino atramentario e alcol',
    text: 'Questo coprino, se mangiato insieme ad alcolici nei giorni vicini al pasto, provoca malessere: evita di abbinarli.',
    icon: 'info',
  },
]
