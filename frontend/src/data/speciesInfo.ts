export type Toxicity = 'mortale' | 'velenoso' | 'tossico'

export interface Lookalike {
  name: string
  latinName: string
  toxicity: Toxicity
  photo?: Photo
  /** Nota sulla foto, se ritrae una specie affine. */
  photoNote?: string
  /** Differenze da controllare rispetto alla specie commestibile. */
  differences: string[]
}

export type CapShape = 'dome' | 'parasol' | 'funnel' | 'morel' | 'egg'

/** Parametri per disegnare l'icona della specie. */
export interface SpeciesLook {
  cap: string
  stem: string
  shape: CapShape
  /** Puntini sul cappello (colore). */
  spots?: string
  ring?: boolean
  bulb?: boolean
}

export interface Photo {
  src: string
  author: string
  license: string
  /** Pagina del file su Wikimedia Commons. */
  url: string
}

export interface SpeciesInfo {
  look: SpeciesLook
  /** Facoltativa: file in `public/species/` con autore e licenza (obbligatori per CC BY). */
  photo?: Photo
  edibility: string
  description: string
  features: { label: string; value: string }[]
  habitat: string
  lookalikes: Lookalike[]
}

// Schede a scopo orientativo: da far verificare a un micologo prima della pubblicazione.
export const SPECIES_INFO: Record<string, SpeciesInfo> = {
  porcino: {
    look: { cap: '#8a5a33', stem: '#efe3cc', shape: 'dome', bulb: true },
    photo: { src: '/species/porcino.jpg', author: 'Matthieu Brochon', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Boletus_edulis_0.jpg' },
    edibility: 'Ottimo commestibile',
    description: 'Il re dei funghi: carnoso, profumato e inconfondibile se si controllano pori e gambo.',
    features: [
      { label: 'Cappello', value: 'Emisferico poi disteso, 7-25 cm, bruno nocciola, cuticola liscia.' },
      { label: 'Sotto il cappello', value: 'Pori (non lamelle), bianchi poi giallo-verdastri.' },
      { label: 'Gambo', value: 'Tozzo, a clava, con sottile reticolo bianco in alto.' },
      { label: 'Carne', value: 'Bianca e compatta, non cambia colore al taglio; profumo gradevole.' },
    ],
    habitat: 'Boschi di latifoglie (faggio, castagno, quercia) e conifere. Da fine primavera all’autunno.',
    lookalikes: [
      {
        name: 'Boleto di Satana',
        latinName: 'Rubroboletus satanas',
        toxicity: 'velenoso',
        photo: { src: '/species/lookalikes/rubroboletus-satanas.jpg', author: 'alyona4', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rubroboletus_satanas_15.jpg' },
        differences: [
          'Pori rossi o arancio-rossi, mai bianchi o giallo-oliva.',
          'Gambo con reticolo rosso e molto panciuto.',
          'La carne diventa azzurra al taglio.',
          'Cappello biancastro-grigiastro.',
        ],
      },
      {
        name: 'Fungo del fiele',
        latinName: 'Tylopilus felleus',
        toxicity: 'tossico',
        photo: { src: '/species/lookalikes/tylopilus-felleus.jpg', author: 'wearethechampignons', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Tylopilus_felleus_10.jpg' },
        differences: [
          'Pori che virano al rosa-vinaccio con la maturità.',
          'Reticolo del gambo scuro, brunastro (nel porcino è chiaro).',
          'Sapore molto amaro: rovina il piatto e può dare disturbi.',
        ],
      },
    ],
  },
  finferlo: {
    look: { cap: '#e8a91f', stem: '#efc04a', shape: 'funnel' },
    photo: { src: '/species/finferlo.jpg', author: 'muukalainen', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Cantharellus_cibarius_149899797.jpg' },
    edibility: 'Ottimo commestibile',
    description: 'Giallo uovo, a forma di imbuto, con un tipico profumo di albicocca.',
    features: [
      { label: 'Cappello', value: 'Irregolare, a imbuto, 3-10 cm, giallo uovo, margine ondulato.' },
      { label: 'Sotto il cappello', value: 'Pieghe false, spesse e ramificate, che scendono sul gambo (non vere lamelle).' },
      { label: 'Gambo', value: 'Pieno, dello stesso colore del cappello, si restringe verso il basso.' },
      { label: 'Carne', value: 'Soda, bianco-giallastra, fibrosa; odore di albicocca.' },
    ],
    habitat: 'Boschi di latifoglie e conifere, sul terreno muschioso. Da giugno a novembre.',
    lookalikes: [
      {
        name: 'Fungo dell’olivo',
        latinName: 'Omphalotus olearius',
        toxicity: 'velenoso',
        photo: { src: '/species/lookalikes/omphalotus-olearius.jpg', author: 'Antonio Abbatiello', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Omphalotus_olearius.JPG' },
        differences: [
          'Cresce a grossi ciuffi su ceppi e radici, non isolato sul terreno.',
          'Ha vere lamelle sottili e taglienti, non pieghe spesse.',
          'Colore arancio intenso; carne arancione, senza profumo di albicocca.',
        ],
      },
      {
        name: 'Falso gallinaccio',
        latinName: 'Hygrophoropsis aurantiaca',
        toxicity: 'tossico',
        photo: { src: '/species/lookalikes/hygrophoropsis-aurantiaca.jpg', author: 'Holger Krisp', license: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:False_Chanterelle_Hygrophoropsis_aurantiaca.jpg' },
        differences: [
          'Lamelle vere, fitte e forcute, di un arancio più vivo.',
          'Cappello vellutato con margine arrotolato; polpa sottile e molle.',
          'Nessun profumo di albicocca.',
        ],
      },
    ],
  },
  'mazza-di-tamburo': {
    look: { cap: '#b79a78', stem: '#e5d3b8', shape: 'parasol', ring: true, bulb: true },
    photo: { src: '/species/mazza-di-tamburo.jpg', author: 'George Chernilevsky', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Macrolepiota_procera_2013_G1.jpg' },
    edibility: 'Ottimo commestibile (solo il cappello, ben cotto)',
    description: 'Grande fungo ad ombrello, riconoscibile dal gambo “a pelle di serpente” e dall’anello mobile.',
    features: [
      { label: 'Cappello', value: 'Fino a 30 cm, da ovale a ombrello, umbone bruno e squame concentriche.' },
      { label: 'Lamelle', value: 'Bianche, fitte, libere dal gambo.' },
      { label: 'Gambo', value: 'Alto, sottile, con zigrinature brune a zig-zag; bulbo alla base.' },
      { label: 'Anello', value: 'Doppio e mobile: scorre lungo il gambo. La carne resta bianca al taglio.' },
    ],
    habitat: 'Radure, margini dei boschi e prati. Da fine primavera all’autunno.',
    lookalikes: [
      {
        name: 'Lepiota bruno-incarnata e altre lepiote piccole',
        latinName: 'Lepiota brunneoincarnata',
        toxicity: 'mortale',
        photo: { src: '/species/lookalikes/lepiota-brunneoincarnata.jpg', author: 'Renée Lebeuf', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Lepiota_helveola_(Qu%C3%A9bec).jpg' },
        photoNote: 'Nella foto: Lepiota helveola, specie affine e ugualmente mortale.',
        differences: [
          'Molto più piccole: cappello di solito sotto i 10 cm.',
          'Gambo liscio, senza zigrinature a serpente.',
          'Anello semplice e fisso, che non scorre.',
        ],
      },
      {
        name: 'Fungo parasole rosseggiante',
        latinName: 'Chlorophyllum brunneum / rachodes',
        toxicity: 'tossico',
        photo: { src: '/species/lookalikes/chlorophyllum-brunneum.jpg', author: 'jensu', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Chlorophyllum_rhacodes_96746131.jpg' },
        photoNote: 'Nella foto: Chlorophyllum rhacodes, specie affine.',
        differences: [
          'La carne diventa rossastra al taglio.',
          'Gambo liscio e tozzo, con bulbo molto marcato.',
          'Può dare disturbi gastrointestinali a molte persone.',
        ],
      },
    ],
  },
  ovolo: {
    look: { cap: '#e2571f', stem: '#f1c21a', shape: 'egg', ring: true },
    photo: { src: '/species/ovolo.jpg', author: 'GLJIVARSKO DRUSTVO NIS from Serbia', license: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:AMANITA_CAESAREA_(Scorp._Fr.)_Quelet_(5981754604).jpg' },
    edibility: 'Ottimo commestibile (specie protetta in alcune zone)',
    description: 'Cappello arancio acceso, lamelle e gambo gialli, volva bianca a sacco.',
    features: [
      { label: 'Cappello', value: 'Arancio-rosso, liscio e senza verruche, margine striato.' },
      { label: 'Lamelle', value: 'Gialle, fitte.' },
      { label: 'Gambo e anello', value: 'Gialli. Alla base una volva bianca a sacco.' },
      { label: 'Da giovane', value: 'Chiuso in un “uovo” bianco: in questo stadio non va raccolto.' },
    ],
    habitat: 'Querceti e castagneti luminosi e caldi. Da luglio a ottobre.',
    lookalikes: [
      {
        name: 'Ovolo malefico',
        latinName: 'Amanita muscaria',
        toxicity: 'velenoso',
        photo: { src: '/species/lookalikes/amanita-muscaria.jpg', author: 'George Chernilevsky', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Amanita_muscaria_2025_G04.jpg' },
        differences: [
          'Cappello rosso con verruche bianche (che però la pioggia può lavare via).',
          'Lamelle, gambo e anello bianchi, mai gialli.',
        ],
      },
      {
        name: 'Tignosa verdognola',
        latinName: 'Amanita phalloides',
        toxicity: 'mortale',
        photo: { src: '/species/lookalikes/amanita-phalloides.jpg', author: 'garmonb0zia', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Amanita_phalloides_60804649.jpg' },
        differences: [
          'Cappello verdastro-olivaceo, ma da giovane può essere confusa con l’ovolo “a uovo”.',
          'Lamelle, anello e volva bianchi: nell’ovolo sono gialle (lamelle e anello).',
          'Mai raccogliere funghi ancora chiusi a forma d’uovo.',
        ],
      },
    ],
  },
  rosito: {
    look: { cap: '#d97a2b', stem: '#e59a4d', shape: 'dome' },
    photo: { src: '/species/rosito.jpg', author: 'Lucian Clanet', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Lactarius_deliciosus_1.jpg' },
    edibility: 'Buon commestibile (da cuocere)',
    description: 'Arancio con zone concentriche e un latte arancio che col tempo vira al verde.',
    features: [
      { label: 'Cappello', value: 'Depresso al centro, 5-15 cm, arancio con anelli concentrici.' },
      { label: 'Lamelle', value: 'Arancio, virano al verde al tocco e con l’età.' },
      { label: 'Gambo', value: 'Corto, con piccole fossette arancio più scure (scrobicoli).' },
      { label: 'Latte', value: 'Arancio carota, diventa verdastro dopo qualche minuto.' },
    ],
    habitat: 'Sotto i pini e altre conifere. Da agosto a novembre.',
    lookalikes: [
      {
        name: 'Lattario torminoso',
        latinName: 'Lactarius torminosus',
        toxicity: 'tossico',
        photo: { src: '/species/lookalikes/lactarius-torminosus.jpg', author: 'S. Rae from Scotland, UK', license: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Lactarius_torminosus_-_Flickr_-_S._Rae_(1).jpg' },
        differences: [
          'Latte bianco e acre, non arancio.',
          'Margine del cappello barbuto, lanoso.',
          'Provoca disturbi gastrointestinali.',
        ],
      },
      {
        name: 'Lattario dal latte giallo',
        latinName: 'Lactarius chrysorrheus',
        toxicity: 'tossico',
        photo: { src: '/species/lookalikes/lactarius-chrysorrheus.jpg', author: 'Dick Culbert from Gibsons, B.C., Canada', license: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Lactarius_chrysorrheus_(33227843906).jpg' },
        differences: [
          'Latte bianco che vira in fretta al giallo zolfo.',
          'Cappello più pallido, color camoscio-arancio chiaro con zone.',
        ],
      },
    ],
  },
  pinarolo: {
    look: { cap: '#6b3f1f', stem: '#efe6cf', shape: 'dome', ring: true },
    photo: { src: '/species/pinarolo.jpg', author: 'Dave W (Mushroom Observer)', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:2012-10-09_Suillus_luteus_(L.)_Roussel_270282.jpg' },
    edibility: 'Buon commestibile (da giovane, senza cuticola e senza gambo fibroso)',
    description: 'Boleto dei pini con cappello viscido bruno lucente, pori gialli e anello sul gambo. Noto anche come pinarello, vavuso o bavusa.',
    features: [
      { label: 'Cappello', value: 'Fino a 12 cm, prima emisferico poi disteso; cuticola viscida, lucente, bruno-rossastra e facile da staccare.' },
      { label: 'Sotto il cappello', value: 'Pori piccoli e tondi, gialli, che non cambiano colore al tatto; da giovane coperti da un velo bianco.' },
      { label: 'Gambo e anello', value: 'Tozzo, biancastro, con punteggiatura giallo-bruna sotto l’anello ampio e membranoso.' },
      { label: 'Carne', value: 'Bianco-giallastra, molle, immutabile al taglio; odore fruttato e sapore dolce.' },
    ],
    habitat: 'Boschi di conifere, soprattutto di pino, in gruppi. Dall’estate all’autunno.',
    lookalikes: [],
  },
  chiodino: {
    look: { cap: '#c79a4a', stem: '#e8d6a7', shape: 'dome', ring: true },
    photo: { src: '/species/chiodino.jpg', author: 'Matt Berger', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Armillaria_mellea_113293797.jpg' },
    edibility: 'Buon commestibile SOLO ben cotto (da crudo o poco cotto è tossico)',
    description: 'Cresce a grossi ciuffi su ceppi e radici, con anello e cappello miele.',
    features: [
      { label: 'Cappello', value: '3-10 cm, color miele, con squamette scure al centro.' },
      { label: 'Lamelle', value: 'Bianche, poi macchiate di bruno; spore bianche.' },
      { label: 'Gambo', value: 'Lungo, fibroso, con anello bianco-giallastro membranoso.' },
      { label: 'Come cresce', value: 'A ciuffi numerosi su ceppi, radici e alberi vivi o morti.' },
    ],
    habitat: 'Boschi di latifoglie e conifere, su legno. Da settembre a novembre.',
    lookalikes: [
      {
        name: 'Galerina marginata',
        latinName: 'Galerina marginata',
        toxicity: 'mortale',
        photo: { src: '/species/lookalikes/galerina-marginata.jpg', author: 'Will Kuhn', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Galerina_marginata_173629635.jpg' },
        differences: [
          'Piccola e sottile, cappello igrofano bruno-miele.',
          'Le spore sono bruno-ruggine (il chiodino le ha bianche): fai sporata su carta.',
          'Cresce su legno marcio, soprattutto di conifere; anello sottile.',
        ],
      },
      {
        name: 'Falso chiodino',
        latinName: 'Hypholoma fasciculare',
        toxicity: 'velenoso',
        photo: { src: '/species/lookalikes/hypholoma-fasciculare.jpg', author: 'Holger Krisp', license: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:Gr%C3%BCnbl%C3%A4ttrige_Schwefelkopf_Hypholoma_fasciculare.jpg' },
        differences: [
          'Cappello giallo-zolfo, senza squamette scure.',
          'Lamelle giallo-verdastre che diventano grigio-olivacee.',
          'Senza anello; sapore amaro.',
        ],
      },
    ],
  },
}
