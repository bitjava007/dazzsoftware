/**
 * Dazzling Tailor ERP — Comprehensive QA Seed
 * Usage: npx tsx prisma/seed.ts
 * Requires: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import "dotenv/config";
import {
  PrismaClient,
  Role,
  OrderStatus,
  PaymentType,
  OrderPaymentType,
  InvoiceStatus,
  LoginStatus,
  AuditAction,
} from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysLater = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
const round2 = (n: number) => Math.round(n * 100) / 100;

let _ord = 1, _pay = 1, _rec = 1, _inv = 1, _dep = 1;
const nextOrd = () => `CMD-2024-${String(_ord++).padStart(4, "0")}`;
const nextPay = () => `PAY-2024-${String(_pay++).padStart(4, "0")}`;
const nextRec = () => `RECU-2024-${String(_rec++).padStart(4, "0")}`;
const nextInv = () => `FACT-2024-${String(_inv++).padStart(4, "0")}`;
const nextDep = () => `DEP-2024-${String(_dep++).padStart(4, "0")}`;

// ─── Reference data ───────────────────────────────────────────────────────────
const USERS_TO_CREATE = [
  { email: "admin@dazzling.com",   password: "Dazzling2024!", fullName: "Administrateur Système", role: Role.admin },
  { email: "manager@dazzling.com", password: "Dazzling2024!", fullName: "Sophie Lefebvre",        role: Role.manager },
  { email: "cashier@dazzling.com", password: "Dazzling2024!", fullName: "Mamadou Balde",          role: Role.accountant },
  { email: "tailor@dazzling.com",  password: "Dazzling2024!", fullName: "Aminata Kouyaté",        role: Role.tailor },
];

const CLIENTS_DATA = [
  // African clients
  { fullName: "Aminata Diallo",       phone: "+221 77 234 5678", email: "aminata.diallo@gmail.com",   country: "Sénégal",       city: "Dakar",         address: "Rue 12 Médina", notes: "Cliente VIP, préfère les tissus wax" },
  { fullName: "Kofi Mensah",          phone: "+233 24 456 7890", email: "kofi.mensah@yahoo.com",       country: "Ghana",         city: "Accra",         address: "28 Nkrumah Ave", notes: "Commandes régulières pour cérémonies" },
  { fullName: "Fatou Traoré",         phone: "+223 76 543 2109", email: "fatou.traore@hotmail.com",    country: "Mali",          city: "Bamako",        address: "Quartier Hamdallaye", notes: "" },
  { fullName: "Ibrahim Coulibaly",    phone: "+225 07 123 4567", email: "ibrahim.coul@gmail.com",      country: "Côte d'Ivoire", city: "Abidjan",       address: "Cocody, Rue des Fleurs", notes: "Homme d'affaires, costumes uniquement" },
  { fullName: "Grace Okonkwo",        phone: "+234 80 345 6789", email: "grace.okonkwo@outlook.com",   country: "Nigeria",       city: "Lagos",         address: "Victoria Island", notes: "Aime les robes de soirée" },
  { fullName: "Mamadou Bah",          phone: "+224 62 789 0123", email: "mamadou.bah@gmail.com",       country: "Guinée",        city: "Conakry",       address: "Kaloum, Tombo", notes: "" },
  { fullName: "Aïcha Koné",           phone: "+225 05 678 9012", email: "aicha.kone@gmail.com",        country: "Côte d'Ivoire", city: "Bouaké",        address: "Quartier Commerce", notes: "Tenue traditionnelle Baoulé" },
  { fullName: "Ousmane Ndiaye",       phone: "+221 70 890 1234", email: "ousmane.ndiaye@senegal.sn",   country: "Sénégal",       city: "Saint-Louis",   address: "Île Nord, Rue Blaise Diagne", notes: "" },
  { fullName: "Mariam Touré",         phone: "+226 70 012 3456", email: "mariam.toure@gmail.com",      country: "Burkina Faso",  city: "Ouagadougou",   address: "Secteur 15, Gounghin", notes: "Commandes pour mariage" },
  { fullName: "Jean-Pierre Mukendi",  phone: "+243 81 234 5678", email: "jp.mukendi@gmail.com",        country: "RDC",           city: "Kinshasa",      address: "Gombe, Avenue Roi Baudouin", notes: "Préfère payer en CDF" },
  { fullName: "Celestine Nkosi",      phone: "+27 82 345 6789",  email: "celestine.nkosi@gmail.com",   country: "Afrique du Sud",city: "Johannesburg",  address: "Sandton, Nelson Mandela Square", notes: "" },
  { fullName: "Amara Kamara",         phone: "+232 78 456 7890", email: "amara.kamara@gmail.com",      country: "Sierra Leone",  city: "Freetown",      address: "Wilberforce, Hill Station", notes: "" },
  { fullName: "Ramatoulaye Baldé",    phone: "+224 64 567 8901", email: "rama.balde@yahoo.fr",         country: "Guinée",        city: "Conakry",       address: "Ratoma, Dixinn", notes: "Collectionne les boubous" },
  { fullName: "Chukwuemeka Obi",      phone: "+234 90 678 9012", email: "chukwu.obi@gmail.com",        country: "Nigeria",       city: "Enugu",         address: "Independence Layout", notes: "Uniforme professionnel" },
  { fullName: "Nafissatou Dembélé",   phone: "+223 66 789 0123", email: "nafi.dembele@gmail.com",      country: "Mali",          city: "Sikasso",       address: "Quartier Médine", notes: "" },
  { fullName: "Samuel Asante",        phone: "+233 20 890 1234", email: "samuel.asante@gmail.com",     country: "Ghana",         city: "Kumasi",        address: "Adum, Prempeh II Street", notes: "Costume pour mariage" },
  { fullName: "Hawa Sylla",           phone: "+224 62 901 2345", email: "hawa.sylla@gmail.com",        country: "Guinée",        city: "Kindia",        address: "Centre-ville Kindia", notes: "" },
  { fullName: "Boubacar Doumbouya",   phone: "+224 66 012 3456", email: "bb.doumbouya@gmail.com",      country: "Guinée",        city: "Conakry",       address: "Matam, Cité Koloma", notes: "Tailleur professionnel partenaire" },
  { fullName: "Mariama Diallo",       phone: "+221 77 123 4567", email: "mariama.diallo@gmail.com",    country: "Sénégal",       city: "Ziguinchor",    address: "Boucotte Ouest", notes: "" },
  { fullName: "Emmanuel Adekunle",    phone: "+234 81 234 5678", email: "emma.ade@yahoo.com",          country: "Nigeria",       city: "Ibadan",        address: "Bodija Estate", notes: "Commandes corporatives" },
  { fullName: "Kadiatou Sow",         phone: "+224 62 345 6789", email: "kadia.sow@gmail.com",         country: "Guinée",        city: "Labé",          address: "Quartier Tata", notes: "Confection traditionnelle Peul" },
  { fullName: "Aboubacar Camara",     phone: "+224 64 456 7890", email: "abou.camara@gmail.com",       country: "Guinée",        city: "Conakry",       address: "Kipé, Ratoma", notes: "" },
  { fullName: "Fanta Keita",          phone: "+223 70 567 8901", email: "fanta.keita@yahoo.fr",        country: "Mali",          city: "Koulikoro",     address: "Quartier Liberté", notes: "" },
  { fullName: "Ismaila Sarr",         phone: "+221 78 678 9012", email: "ismaila.sarr@gmail.com",      country: "Sénégal",       city: "Thiès",         address: "Randoulène Nord", notes: "Commande pour équipe sportive" },
  { fullName: "Binta Jallow",         phone: "+220 99 789 0123", email: "binta.jallow@gmail.com",      country: "Gambie",        city: "Banjul",        address: "Cape Point, Bakau", notes: "" },
  // European / International
  { fullName: "Sophie Lefebvre",      phone: "+33 6 12 34 56 78", email: "sophie.lefebvre@gmail.com",  country: "France",        city: "Paris",         address: "15 Rue de Rivoli, 75001", notes: "Commandes haute couture" },
  { fullName: "Marco Rossi",          phone: "+39 340 123 4567",  email: "marco.rossi@libero.it",       country: "Italie",        city: "Milan",         address: "Via Monte Napoleone 12", notes: "Costumes italiens sur mesure" },
  { fullName: "Ana González",         phone: "+34 612 345 678",   email: "ana.gonzalez@gmail.com",      country: "Espagne",       city: "Madrid",        address: "Gran Vía 48, 3°", notes: "" },
  { fullName: "David Müller",         phone: "+49 170 234 5678",  email: "d.mueller@gmail.de",          country: "Allemagne",     city: "Berlin",        address: "Kurfürstendamm 234", notes: "Tenues pour conférences" },
  { fullName: "Emma Thompson",        phone: "+44 7712 345678",   email: "emma.t@outlook.co.uk",        country: "Royaume-Uni",   city: "Londres",       address: "Baker Street 221B", notes: "" },
  { fullName: "Pierre Dubois",        phone: "+33 6 98 76 54 32", email: "pierre.dubois@orange.fr",     country: "France",        city: "Lyon",          address: "Place Bellecour 1", notes: "Commandes professionnelles" },
  { fullName: "Maria Santos",         phone: "+351 912 345 678",  email: "maria.santos@gmail.pt",       country: "Portugal",      city: "Lisbonne",      address: "Rua Augusta 45", notes: "" },
  { fullName: "James Chen",           phone: "+1 917 234 5678",   email: "james.chen@gmail.com",        country: "USA",           city: "New York",      address: "5th Avenue 350", notes: "Paye en USD exclusivement" },
  { fullName: "Yasmine Al-Hassan",    phone: "+961 3 234 567",    email: "yasmine.alhassan@gmail.com",  country: "Liban",         city: "Beyrouth",      address: "Rue Hamra 78", notes: "" },
  { fullName: "Priya Sharma",         phone: "+91 98765 43210",   email: "priya.sharma@gmail.com",      country: "Inde",          city: "Mumbai",        address: "Bandra West, Hill Road", notes: "" },
  { fullName: "Laure Martin",         phone: "+33 7 45 67 89 01", email: "laure.martin@gmail.com",      country: "France",        city: "Marseille",     address: "Cours Julien 34", notes: "Tenues de soirée" },
  { fullName: "Carlos Rodriguez",     phone: "+52 55 1234 5678",  email: "carlos.rod@hotmail.com",      country: "Mexique",       city: "Mexico City",   address: "Paseo de la Reforma 200", notes: "" },
  { fullName: "Nadia Patel",          phone: "+44 7823 456789",   email: "nadia.patel@gmail.com",       country: "Royaume-Uni",   city: "Leicester",     address: "Charles Street 67", notes: "" },
  { fullName: "Thomas Bernard",       phone: "+32 478 90 12 34",  email: "thomas.bernard@gmail.be",     country: "Belgique",      city: "Bruxelles",     address: "Boulevard de Waterloo 23", notes: "" },
  { fullName: "Claire Dupont",        phone: "+33 6 34 56 78 90", email: "claire.dupont@gmail.com",     country: "France",        city: "Bordeaux",      address: "Place du Parlement 5", notes: "Mariée — robe et suite nuptiale" },
];

const ARTICLE_TYPES_DATA = [
  { name: "Vêtements traditionnels", description: "Boubous, tenues africaines traditionnelles" },
  { name: "Costumes",                description: "Costumes homme et femme sur mesure" },
  { name: "Chemises",                description: "Chemises et hauts sur mesure" },
  { name: "Pantalons",               description: "Pantalons et shorts sur mesure" },
  { name: "Robes",                   description: "Robes de soirée, mariée, casual" },
  { name: "Jupes",                   description: "Jupes diverses longueurs et styles" },
  { name: "Vestes",                  description: "Vestes, blazers et manteaux" },
  { name: "Uniformes",               description: "Uniformes professionnels et scolaires" },
  { name: "Sacs",                    description: "Sacs à main et accessoires cuir" },
  { name: "Chaussures",              description: "Chaussures artisanales sur mesure" },
  { name: "Retouches",               description: "Retouches et ajustements" },
  { name: "Accessoires",             description: "Ceintures, foulards, bijoux textiles" },
];

const ARTICLES_DATA = [
  // Vêtements traditionnels
  { name: "Boubou grand complet homme",   desc: "Boubou 3 pièces brodé, tissu bazin",         price: 120 },
  { name: "Boubou femme festif",          desc: "Boubou 2 pièces tissu wax premium",           price: 95 },
  { name: "Tenue bogolan homme",          desc: "Ensemble bogolan authentique",                 price: 110 },
  { name: "Robe kente",                   desc: "Robe en tissu kente ghanéen",                  price: 130 },
  { name: "Ensemble Peul",               desc: "Tenue traditionnelle Peul brodée",             price: 100 },
  { name: "Kaftan marocain",             desc: "Kaftan coton avec broderies dorées",           price: 140 },
  { name: "Djellaba homme",             desc: "Djellaba légère en coton",                      price: 85 },
  { name: "Tenue deuil complète",        desc: "Ensemble sobre pour cérémonies de deuil",      price: 75 },
  // Costumes
  { name: "Costume 2 pièces classique",  desc: "Veste + pantalon tissu premium",               price: 220 },
  { name: "Costume 3 pièces business",   desc: "Costume complet avec gilet",                   price: 280 },
  { name: "Costume mariage homme",       desc: "Costume haute couture pour mariés",            price: 350 },
  { name: "Tailleur femme 2 pièces",     desc: "Veste + jupe/pantalon",                        price: 190 },
  { name: "Smoking noir",               desc: "Smoking classique avec nœud papillon",         price: 320 },
  { name: "Costume safari",             desc: "Costume lin style colonial revisité",           price: 175 },
  // Chemises
  { name: "Chemise wax homme",          desc: "Chemise en tissu wax africain",                 price: 45 },
  { name: "Chemise oxford sur mesure",  desc: "Chemise 100% coton oxford",                    price: 55 },
  { name: "Chemise lin décontractée",   desc: "Chemise lin lavé, col mao",                    price: 50 },
  { name: "Blouse femme classique",     desc: "Blouse élégante en soie artificielle",          price: 60 },
  { name: "Chemisier à volants",        desc: "Chemisier festif avec volants",                 price: 65 },
  // Pantalons
  { name: "Pantalon droit classique",   desc: "Pantalon coupe droite, tissu laine",           price: 70 },
  { name: "Pantalon slim business",     desc: "Pantalon slim élégant",                         price: 75 },
  { name: "Pantalon large bohème",      desc: "Pantalon ample tissu fluide",                   price: 60 },
  { name: "Jean sur mesure",            desc: "Jean ajusté sur mesure",                        price: 80 },
  { name: "Sarouel africain",           desc: "Sarouel moderne en tissu africain",             price: 55 },
  // Robes
  { name: "Robe mariée simple",         desc: "Robe de mariée élégante sans fioritures",      price: 450 },
  { name: "Robe mariée luxe",           desc: "Robe de mariée avec traîne et broderies",      price: 750 },
  { name: "Robe de soirée courte",      desc: "Robe cocktail chic",                            price: 120 },
  { name: "Robe de soirée longue",      desc: "Robe de bal élégante",                         price: 180 },
  { name: "Robe wax casual",            desc: "Robe décontractée en wax",                     price: 70 },
  { name: "Robe bureau femme",          desc: "Robe mi-longue professionnelle",               price: 95 },
  // Jupes
  { name: "Jupe crayon wax",            desc: "Jupe crayon en tissu wax",                     price: 45 },
  { name: "Jupe longue africaine",      desc: "Jupe longue en tissu batik",                   price: 55 },
  { name: "Jupe mi-longue plissée",     desc: "Jupe plissée en tissu léger",                  price: 50 },
  { name: "Jupe trapèze classique",     desc: "Jupe trapèze en crêpe",                        price: 48 },
  // Vestes
  { name: "Blazer homme africain",      desc: "Blazer en tissu wax structuré",                price: 110 },
  { name: "Veste en jean sur mesure",   desc: "Veste jean personnalisée",                     price: 90 },
  { name: "Manteau léger printemps",    desc: "Manteau mi-saison en laine légère",            price: 160 },
  { name: "Gilet sans manches business",desc: "Gilet élégant pour costume",                   price: 70 },
  // Uniformes
  { name: "Uniforme scolaire complet",  desc: "Chemise + pantalon/jupe + cravate",            price: 65 },
  { name: "Uniforme hôtellerie",        desc: "Tenue complète personnel hôtel",               price: 85 },
  { name: "Blouse médicale",            desc: "Blouse médicale coton",                        price: 40 },
  // Sacs
  { name: "Sac à main wax",             desc: "Sac à main artisanal en tissu wax",            price: 55 },
  { name: "Sac bandoulière cuir",       desc: "Sac en cuir naturel teint",                   price: 95 },
  { name: "Pochette soirée",            desc: "Pochette élégante pour soirées",              price: 40 },
  // Chaussures
  { name: "Ballerines cuir",            desc: "Ballerines confort en cuir souple",            price: 65 },
  { name: "Mocassins homme cuir",       desc: "Mocassins classiques cuir naturel",            price: 80 },
  { name: "Sandales artisanales",       desc: "Sandales en cuir tissé à la main",             price: 45 },
  // Retouches
  { name: "Retouche simple",            desc: "Ourlet, fermeture, ajustement simple",         price: 12 },
  { name: "Retouche complexe",          desc: "Transformation majeure d'un vêtement",         price: 35 },
  // Accessoires
  { name: "Ceinture cuir sur mesure",   desc: "Ceinture artisanale en cuir",                  price: 30 },
  { name: "Foulard soie wax",           desc: "Foulard 100% soie à motif africain",           price: 25 },
];

const EXPENSE_CATS = [
  { id: "cat-matiere",   name: "Matières premières", desc: "Tissu, fil, boutons, fermetures", subs: [
    { id: "sub-tissu",   name: "Tissu",             desc: "Achats de tissu" },
    { id: "sub-fil",     name: "Fil & accessoires", desc: "Fil, boutons, fermetures" },
    { id: "sub-doub",    name: "Doublure",          desc: "Tissu de doublure" },
  ]},
  { id: "cat-main",      name: "Main d'œuvre",       desc: "Rémunération des tailleurs", subs: [
    { id: "sub-salaire", name: "Salaires",           desc: "Salaires mensuels" },
    { id: "sub-piece",   name: "Pièces",             desc: "Paiement à la pièce" },
  ]},
  { id: "cat-charge",    name: "Charges fixes",       desc: "Loyer, électricité, eau", subs: [
    { id: "sub-loyer",   name: "Loyer",              desc: "Loyer atelier" },
    { id: "sub-elec",    name: "Électricité",        desc: "Factures électricité" },
    { id: "sub-eau",     name: "Eau",                desc: "Factures eau" },
  ]},
  { id: "cat-equip",     name: "Équipement",          desc: "Machines, outils, entretien", subs: [
    { id: "sub-mach",    name: "Machines",           desc: "Machines à coudre et équipements" },
    { id: "sub-maint",   name: "Maintenance",        desc: "Réparations et maintenance" },
  ]},
  { id: "cat-transport", name: "Transport",            desc: "Livraisons et déplacements", subs: [
    { id: "sub-livr",    name: "Livraisons",         desc: "Frais de livraison clients" },
    { id: "sub-dep",     name: "Déplacements",       desc: "Frais de déplacement équipe" },
  ]},
  { id: "cat-market",    name: "Marketing",            desc: "Publicité et promotion", subs: [
    { id: "sub-pub",     name: "Publicité",          desc: "Réseaux sociaux, affiches" },
    { id: "sub-promo",   name: "Promotions",         desc: "Remises et événements" },
  ]},
  { id: "cat-divers",    name: "Divers",               desc: "Autres dépenses", subs: [
    { id: "sub-food",    name: "Restauration",       desc: "Repas équipe" },
    { id: "sub-other",   name: "Autres",             desc: "Dépenses diverses" },
  ]},
];

const ORDER_STATUSES: OrderStatus[] = [
  "brouillon", "confirmee", "mesures_prises", "tissu_achete",
  "coupe", "couture", "essayage", "retouches", "finition",
  "pret_livraison", "livree", "annulee",
];

const PAYMENT_METHODS: PaymentType[] = ["cash", "mobile_money", "wave", "orange_money", "bank_transfer", "card"];

async function main() {
  console.log("🌱 Dazzling Tailor QA Seed — démarrage...\n");

  // ─── 1. Clean business data ────────────────────────────────────────────────
  console.log("🧹 Nettoyage des données existantes...");
  await prisma.auditLog.deleteMany();
  await prisma.userLoginHistory.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderPayment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.client.deleteMany();
  await prisma.article.deleteMany();
  await prisma.articleType.deleteMany();
  await prisma.exchangeRate.deleteMany();
  console.log("✅ Nettoyage terminé\n");

  // ─── 2. Currencies ────────────────────────────────────────────────────────
  console.log("💱 Création des devises...");
  const [usd, xof, eur, cdf, gbp] = await Promise.all([
    prisma.currency.upsert({ where: { code: "USD" }, update: {}, create: { code: "USD", name: "Dollar américain",        symbol: "$",   isActive: true } }),
    prisma.currency.upsert({ where: { code: "XOF" }, update: {}, create: { code: "XOF", name: "Franc CFA Ouest-africain", symbol: "CFA", isActive: true } }),
    prisma.currency.upsert({ where: { code: "EUR" }, update: {}, create: { code: "EUR", name: "Euro",                    symbol: "€",   isActive: true } }),
    prisma.currency.upsert({ where: { code: "CDF" }, update: {}, create: { code: "CDF", name: "Franc congolais",          symbol: "FC",  isActive: true } }),
    prisma.currency.upsert({ where: { code: "GBP" }, update: {}, create: { code: "GBP", name: "Livre sterling",           symbol: "£",   isActive: true } }),
  ]);
  console.log("✅ Devises : USD, XOF, EUR, CDF, GBP\n");

  // ─── 3. Settings ──────────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: "default-settings" },
    update: { companyName: "Dazzling Tailor", defaultCurrencyId: usd.id },
    create: {
      id: "default-settings",
      companyName: "Dazzling Tailor",
      address: "18 Avenue des Artisans, Conakry, Guinée",
      phone: "+224 62 345 6789",
      email: "contact@dazzlingtailor.gn",
      taxNumber: "GN-2024-DT-0042",
      defaultCurrencyId: usd.id,
      invoicePrefix: "FACT-",
      receiptPrefix: "RECU-",
      language: "fr",
    },
  });
  console.log("✅ Paramètres configurés\n");

  // ─── 4. Exchange Rates ────────────────────────────────────────────────────
  console.log("📈 Création des taux de change...");
  const rateData = [
    { from: usd, to: xof, rate: 610.5,    date: daysAgo(90) },
    { from: usd, to: xof, rate: 605.2,    date: daysAgo(60) },
    { from: usd, to: xof, rate: 615.0,    date: daysAgo(30) },
    { from: usd, to: xof, rate: 618.75,   date: daysAgo(7) },
    { from: eur, to: usd, rate: 1.08,     date: daysAgo(90) },
    { from: eur, to: usd, rate: 1.09,     date: daysAgo(60) },
    { from: eur, to: usd, rate: 1.085,    date: daysAgo(30) },
    { from: eur, to: usd, rate: 1.092,    date: daysAgo(7) },
    { from: usd, to: cdf, rate: 2800,     date: daysAgo(90) },
    { from: usd, to: cdf, rate: 2850,     date: daysAgo(60) },
    { from: usd, to: cdf, rate: 2820,     date: daysAgo(30) },
    { from: gbp, to: usd, rate: 1.27,     date: daysAgo(30) },
    { from: gbp, to: eur, rate: 1.17,     date: daysAgo(30) },
    { from: xof, to: eur, rate: 0.001524, date: daysAgo(7) },
  ];
  for (const r of rateData) {
    await prisma.exchangeRate.create({
      data: {
        fromCurrencyId: r.from.id, toCurrencyId: r.to.id,
        rate: r.rate, effectiveDate: r.date, source: "Manuel", isActive: true,
      },
    });
  }
  console.log(`✅ ${rateData.length} taux de change créés\n`);

  // ─── 5. Expense Categories ────────────────────────────────────────────────
  console.log("📂 Création des catégories de dépenses...");
  for (const cat of EXPENSE_CATS) {
    const { subs, desc, ...catData } = cat;
    await prisma.expenseCategory.upsert({ where: { id: cat.id }, update: {}, create: { ...catData, description: desc } });
    for (const sub of subs) {
      const { desc: sd, ...subData } = sub;
      await prisma.expenseSubcategory.upsert({ where: { id: sub.id }, update: {}, create: { ...subData, description: sd, categoryId: cat.id } });
    }
  }
  console.log("✅ Catégories de dépenses créées\n");

  // ─── 6. Auth Users & Profiles ─────────────────────────────────────────────
  console.log("👥 Création des comptes utilisateurs...");
  const profileIds: Record<string, string> = {};
  for (const u of USERS_TO_CREATE) {
    // Try to get existing user first
    const { data: existList } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existList?.users?.find((us: any) => us.email === u.email);
    let uid: string;
    if (existing) {
      uid = existing.id;
      console.log(`  ♻️  ${u.email} — déjà existant`);
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName, role: u.role },
      });
      if (error) throw new Error(`Erreur création ${u.email}: ${error.message}`);
      uid = data.user!.id;
      console.log(`  ✅ ${u.email} créé (${uid.substring(0, 8)}...)`);
    }
    // Update profile role
    await prisma.profile.upsert({
      where: { id: uid },
      update: { fullName: u.fullName, role: u.role, isActive: true },
      create: { id: uid, fullName: u.fullName, role: u.role, isActive: true },
    });
    profileIds[u.email] = uid;
  }
  const adminId   = profileIds["admin@dazzling.com"];
  const managerId = profileIds["manager@dazzling.com"];
  const cashierId = profileIds["cashier@dazzling.com"];
  const tailorId  = profileIds["tailor@dazzling.com"];
  console.log("✅ Utilisateurs créés\n");

  // ─── 7. Article Types ─────────────────────────────────────────────────────
  console.log("🏷️  Création des types d'articles...");
  const artTypes: { id: string; name: string }[] = [];
  for (const at of ARTICLE_TYPES_DATA) {
    const rec = await prisma.articleType.create({ data: { ...at, isActive: true, createdById: adminId } });
    artTypes.push(rec);
  }
  console.log(`✅ ${artTypes.length} types d'articles\n`);

  // ─── 8. Articles ──────────────────────────────────────────────────────────
  console.log("👗 Création des articles...");
  const articles: { id: string; name: string; indicativePrice: any }[] = [];
  for (let i = 0; i < ARTICLES_DATA.length; i++) {
    const a = ARTICLES_DATA[i];
    const typeIdx = Math.floor(i / (ARTICLES_DATA.length / artTypes.length));
    const artType = artTypes[Math.min(typeIdx, artTypes.length - 1)];
    const rec = await prisma.article.create({
      data: {
        name: a.name,
        description: a.desc,
        articleTypeId: artType.id,
        indicativePrice: a.price,
        isActive: true,
        createdById: adminId,
      },
    });
    articles.push(rec);
  }
  console.log(`✅ ${articles.length} articles créés\n`);

  // ─── 9. Clients ───────────────────────────────────────────────────────────
  console.log("👤 Création des clients...");
  const clients: { id: string; fullName: string }[] = [];
  for (const c of CLIENTS_DATA) {
    const rec = await prisma.client.create({ data: { ...c, createdById: adminId } });
    clients.push(rec);
  }
  console.log(`✅ ${clients.length} clients créés\n`);

  // ─── 10. Measurements ─────────────────────────────────────────────────────
  console.log("📏 Création des mesures...");
  const measureClients = clients.slice(0, 32);
  const measurements: { id: string; clientId: string }[] = [];
  for (const cl of measureClients) {
    // Base measurements with natural variation
    const base = { chest: rand(82, 105), waist: rand(68, 95), hips: rand(86, 108) };
    const rec = await prisma.measurement.create({
      data: {
        clientId: cl.id,
        profileName: `Tenue principale — ${cl.fullName.split(" ")[0]}`,
        chest: base.chest,
        waist: base.waist,
        hips: base.hips,
        shoulders: round2(base.chest * 0.42),
        armLength: rand(56, 64),
        neck: rand(36, 42),
        shirtLength: rand(68, 78),
        trouserLength: rand(96, 108),
        dressLength: rand(90, 130),
        wrist: rand(15, 18),
        thigh: rand(50, 68),
        knee: rand(34, 44),
        ankle: rand(22, 28),
        inseam: rand(72, 84),
        notes: "Prise le " + daysAgo(rand(10, 120)).toLocaleDateString("fr-FR"),
        createdById: tailorId,
      },
    });
    measurements.push(rec);
    // Some clients have a second profile
    if (rand(0, 2) === 0) {
      const rec2 = await prisma.measurement.create({
        data: {
          clientId: cl.id,
          profileName: "Tenue de cérémonie",
          chest: base.chest + rand(-1, 1),
          waist: base.waist + rand(-1, 1),
          hips: base.hips + rand(-1, 1),
          shoulders: round2(base.chest * 0.42),
          armLength: rand(56, 64),
          neck: rand(36, 42),
          trouserLength: rand(96, 108),
          dressLength: rand(110, 140),
          createdById: tailorId,
        },
      });
      measurements.push(rec2);
    }
  }
  console.log(`✅ ${measurements.length} fiches de mesures créées\n`);

  // ─── 11. Orders ───────────────────────────────────────────────────────────
  console.log("📦 Création des commandes...");
  const CURRENCIES_POOL = [usd, usd, usd, xof, xof, eur, eur, cdf, gbp];
  const STATUS_WEIGHTS: OrderStatus[] = [
    "livree", "livree", "livree", "livree",
    "pret_livraison", "pret_livraison",
    "couture", "couture", "couture",
    "confirmee", "confirmee",
    "mesures_prises", "tissu_achete",
    "essayage", "retouches", "finition",
    "brouillon", "annulee",
  ];

  const orders: {
    id: string; clientId: string; currencyId: string;
    sellingPrice: number; currentStatus: OrderStatus; orderDate: Date;
    measurementId?: string;
  }[] = [];

  for (let i = 0; i < 85; i++) {
    const client = clients[i % clients.length];
    const currency = pick(CURRENCIES_POOL);
    const status = pick(STATUS_WEIGHTS);
    const orderDate = daysAgo(rand(5, 300));
    const numLines = rand(1, 5);
    const lineArticles = [];
    let subtotal = 0;

    for (let l = 0; l < numLines; l++) {
      const art = pick(articles);
      const qty = rand(1, 3);
      const price = round2(Number(art.indicativePrice) * (0.8 + Math.random() * 0.6));
      const lineTotal = round2(price * qty);
      subtotal = round2(subtotal + lineTotal);
      lineArticles.push({ art, qty, price, lineTotal });
    }

    const discount = rand(0, 2) === 0 ? round2(subtotal * 0.05) : 0;
    const bonus    = rand(0, 3) === 0 ? round2(subtotal * 0.03) : 0;
    const sellingPrice = round2(subtotal - discount - bonus);

    const clientMeasurement = measurements.find((m) => m.clientId === client.id);
    const expectedDel = daysLater(orderDate, rand(14, 60));
    const actualDel = ["livree", "pret_livraison"].includes(status)
      ? daysLater(orderDate, rand(20, 55)) : undefined;

    const order = await prisma.order.create({
      data: {
        orderNumber: nextOrd(),
        clientId: client.id,
        measurementId: clientMeasurement?.id,
        subtotal,
        discount,
        bonus,
        sellingPrice,
        currencyId: currency.id,
        orderDate,
        expectedDeliveryDate: expectedDel,
        actualDeliveryDate: actualDel,
        currentStatus: status,
        notes: rand(0, 2) === 0 ? "Client prioritaire — respecter délais" : null,
        createdById: managerId,
        lines: {
          create: lineArticles.map((la) => ({
            articleId: la.art.id,
            description: la.art.name,
            quantity: la.qty,
            unitPrice: la.price,
            lineTotal: la.lineTotal,
          })),
        },
        statusHistory: {
          create: buildStatusHistory(status, orderDate, managerId),
        },
      },
    });
    orders.push({ id: order.id, clientId: client.id, currencyId: currency.id, sellingPrice, currentStatus: status, orderDate });
  }
  console.log(`✅ ${orders.length} commandes avec lignes créées\n`);

  // ─── 12. Payments ─────────────────────────────────────────────────────────
  console.log("💳 Création des paiements...");
  let totalPaymentsCreated = 0;
  const orderPaidAmounts: Record<string, number> = {};

  // Pay fully-delivered orders first (livree, pret_livraison)
  const deliveredOrders = orders.filter((o) => ["livree", "pret_livraison"].includes(o.currentStatus));
  const inProgressOrders = orders.filter((o) => !["livree", "pret_livraison", "brouillon", "annulee"].includes(o.currentStatus));
  const earlyOrders = orders.filter((o) => ["brouillon", "confirmee"].includes(o.currentStatus));

  for (const order of deliveredOrders) {
    const paid = await createPaymentsForOrder(order, "full", adminId, cashierId);
    orderPaidAmounts[order.id] = paid;
    totalPaymentsCreated += paid > 0 ? 1 : 0;
  }
  for (const order of inProgressOrders) {
    const paid = await createPaymentsForOrder(order, "partial", adminId, cashierId);
    orderPaidAmounts[order.id] = paid;
  }
  for (const order of earlyOrders) {
    if (rand(0, 1) === 0) {
      const paid = await createPaymentsForOrder(order, "advance", adminId, cashierId);
      orderPaidAmounts[order.id] = paid;
    } else {
      orderPaidAmounts[order.id] = 0;
    }
  }
  const payCount = await prisma.orderPayment.count();
  console.log(`✅ ${payCount} paiements créés\n`);

  // ─── 13. Invoices ─────────────────────────────────────────────────────────
  console.log("🧾 Création des factures...");

  // Single-order invoices (from delivered orders)
  const invoiceOrders = deliveredOrders.slice(0, 28);
  for (const order of invoiceOrders) {
    const amtPaid = orderPaidAmounts[order.id] ?? 0;
    const balance = round2(order.sellingPrice - amtPaid);
    const status: InvoiceStatus =
      balance <= 0 ? "paid" :
      amtPaid > 0  ? "partially_paid" :
      rand(0, 1) === 0 ? "issued" : "draft";

    await prisma.invoice.create({
      data: {
        invoiceNumber: nextInv(),
        clientId: order.clientId,
        orderId: order.id,
        issueDate: daysLater(order.orderDate, rand(1, 10)),
        dueDate: daysLater(order.orderDate, rand(30, 60)),
        subtotal: order.sellingPrice,
        discount: 0,
        bonus: 0,
        totalAmount: order.sellingPrice,
        currencyId: order.currencyId,
        amountPaid: Math.min(amtPaid, order.sellingPrice),
        balanceDue: Math.max(0, balance),
        status,
        notes: status === "paid" ? "Payée intégralement" : null,
        createdById: cashierId,
        items: {
          create: [{ orderId: order.id, amount: order.sellingPrice }],
        },
      },
    });
  }

  // Multi-order consolidated invoices (groups of 2-3 orders)
  const multiOrderPool = orders.filter((o) => !invoiceOrders.find((io) => io.id === o.id)).slice(0, 24);
  let mIdx = 0;
  while (mIdx + 1 < multiOrderPool.length) {
    const group = multiOrderPool.slice(mIdx, mIdx + rand(2, 3));
    mIdx += group.length;
    if (group.length < 2) break;
    // All orders in group must be same client for realism
    const grpClient = group[0].clientId;
    const grpTotal = round2(group.reduce((s, o) => s + o.sellingPrice, 0));
    const grpPaid  = round2(group.reduce((s, o) => s + (orderPaidAmounts[o.id] ?? 0), 0));
    const balance  = round2(grpTotal - grpPaid);
    const status: InvoiceStatus = balance <= 0 ? "paid" : grpPaid > 0 ? "partially_paid" : "issued";
    await prisma.invoice.create({
      data: {
        invoiceNumber: nextInv(),
        clientId: group[0].clientId,
        orderId: null,
        issueDate: daysLater(group[0].orderDate, rand(3, 15)),
        dueDate: daysLater(group[0].orderDate, rand(30, 60)),
        subtotal: grpTotal,
        discount: rand(0, 2) === 0 ? round2(grpTotal * 0.05) : 0,
        bonus: 0,
        totalAmount: grpTotal,
        currencyId: group[0].currencyId,
        amountPaid: Math.min(grpPaid, grpTotal),
        balanceDue: Math.max(0, balance),
        status,
        notes: `Facture consolidée — ${group.length} commandes`,
        createdById: cashierId,
        items: {
          create: group.map((o) => ({ orderId: o.id, amount: o.sellingPrice })),
        },
      },
    });
  }

  // A few cancelled invoices
  for (let i = 0; i < 3; i++) {
    const order = pick(orders);
    await prisma.invoice.create({
      data: {
        invoiceNumber: nextInv(),
        clientId: order.clientId,
        orderId: order.id,
        issueDate: daysAgo(rand(10, 90)),
        subtotal: order.sellingPrice,
        discount: 0,
        bonus: 0,
        totalAmount: order.sellingPrice,
        currencyId: order.currencyId,
        amountPaid: 0,
        balanceDue: order.sellingPrice,
        status: "cancelled",
        notes: "Annulée — client a changé d'avis",
        createdById: cashierId,
        items: {
          create: [{ orderId: order.id, amount: order.sellingPrice }],
        },
      },
    });
  }
  const invCount = await prisma.invoice.count();
  console.log(`✅ ${invCount} factures créées\n`);

  // ─── 14. Expenses ─────────────────────────────────────────────────────────
  console.log("💸 Création des dépenses...");
  const expenseTemplates = [
    // Matières premières - tissu
    { catId: "cat-matiere", subId: "sub-tissu",   label: "Achat tissu wax Holland",      min: 80,   max: 350,  meth: "cash" as PaymentType,          bene: "Marché Madina" },
    { catId: "cat-matiere", subId: "sub-tissu",   label: "Tissu bazin riche importé",    min: 150,  max: 500,  meth: "bank_transfer" as PaymentType,  bene: "Importateur Conakry" },
    { catId: "cat-matiere", subId: "sub-fil",     label: "Fil à coudre - lot 50 bobines",min: 20,   max: 60,   meth: "cash" as PaymentType,          bene: "Mercerie du Centre" },
    { catId: "cat-matiere", subId: "sub-doub",    label: "Doublure polyester",           min: 30,   max: 80,   meth: "cash" as PaymentType,          bene: "Marché Madina" },
    // Main d'œuvre
    { catId: "cat-main",    subId: "sub-salaire", label: "Salaires tailleurs — mensuel", min: 400,  max: 1200, meth: "mobile_money" as PaymentType,  bene: "Équipe Dazzling" },
    { catId: "cat-main",    subId: "sub-piece",   label: "Paiement à la pièce",          min: 50,   max: 200,  meth: "cash" as PaymentType,          bene: "Tailleur externe" },
    // Charges fixes
    { catId: "cat-charge",  subId: "sub-loyer",   label: "Loyer atelier mensuel",        min: 300,  max: 500,  meth: "bank_transfer" as PaymentType,  bene: "Propriétaire Lansana" },
    { catId: "cat-charge",  subId: "sub-elec",    label: "Facture électricité EDG",      min: 60,   max: 150,  meth: "mobile_money" as PaymentType,  bene: "EDG Guinée" },
    { catId: "cat-charge",  subId: "sub-eau",     label: "Facture eau SEG",              min: 20,   max: 50,   meth: "mobile_money" as PaymentType,  bene: "SEG Guinée" },
    // Équipement
    { catId: "cat-equip",   subId: "sub-mach",    label: "Machine Singer révisée",       min: 200,  max: 800,  meth: "cash" as PaymentType,          bene: "Atelier Singer Conakry" },
    { catId: "cat-equip",   subId: "sub-maint",   label: "Maintenance machines",         min: 30,   max: 120,  meth: "cash" as PaymentType,          bene: "Technicien Ibrahima" },
    // Transport
    { catId: "cat-transport",subId: "sub-livr",   label: "Livraison commande client",    min: 5,    max: 30,   meth: "cash" as PaymentType,          bene: "Taxi Conakry" },
    { catId: "cat-transport",subId: "sub-dep",    label: "Déplacement achat tissu",      min: 10,   max: 40,   meth: "cash" as PaymentType,          bene: "Transport" },
    // Marketing
    { catId: "cat-market",  subId: "sub-pub",     label: "Publicité Facebook/Instagram", min: 30,   max: 100,  meth: "card" as PaymentType,          bene: "Meta Platforms" },
    { catId: "cat-market",  subId: "sub-promo",   label: "Impression flyers",            min: 40,   max: 120,  meth: "cash" as PaymentType,          bene: "Imprimerie Moderne" },
    // Divers
    { catId: "cat-divers",  subId: "sub-food",    label: "Déjeuner équipe",              min: 15,   max: 50,   meth: "cash" as PaymentType,          bene: "Restaurant du Coin" },
    { catId: "cat-divers",  subId: "sub-other",   label: "Fournitures bureau",           min: 10,   max: 40,   meth: "cash" as PaymentType,          bene: "Papeterie" },
  ];

  for (let i = 0; i < 65; i++) {
    const tmpl = pick(expenseTemplates);
    const amount = round2(rand(tmpl.min, tmpl.max));
    const linkedOrder = rand(0, 3) === 0 ? pick(orders) : null;
    const expCurrency = rand(0, 2) === 0 ? xof : usd;
    await prisma.expense.create({
      data: {
        expenseNumber: nextDep(),
        categoryId: tmpl.catId,
        subcategoryId: tmpl.subId,
        orderId: linkedOrder?.id ?? null,
        linkedToOrder: linkedOrder !== null,
        expenseDate: daysAgo(rand(0, 180)),
        beneficiary: tmpl.bene,
        paymentType: tmpl.meth,
        amountOriginal: amount,
        currencyId: expCurrency.id,
        label: tmpl.label,
        details: null,
        createdById: cashierId,
      },
    });
  }
  const expCount = await prisma.expense.count();
  console.log(`✅ ${expCount} dépenses créées\n`);

  // ─── 15. Login History ────────────────────────────────────────────────────
  console.log("🔐 Création de l'historique de connexions...");
  const userIds = [adminId, managerId, cashierId, tailorId];
  const browsers = ["Chrome 120", "Firefox 121", "Safari 17", "Edge 120"];
  const devices  = ["desktop", "mobile", "tablet"];
  const ips      = ["41.200.12.34", "196.28.45.67", "197.0.34.89", "41.155.2.10", "90.85.12.34"];
  const countries = ["Guinée", "Sénégal", "Côte d'Ivoire", "France", "USA"];

  for (const uid of userIds) {
    for (let i = 0; i < rand(8, 15); i++) {
      const isSuccess = rand(0, 5) !== 0;
      const loginAt   = daysAgo(rand(0, 60));
      await prisma.userLoginHistory.create({
        data: {
          userId: uid,
          loginAt,
          logoutAt: isSuccess ? daysLater(loginAt, 0) : null,
          sessionDuration: isSuccess ? rand(600, 14400) : null,
          ipAddress: pick(ips),
          userAgent: `Mozilla/5.0 (${pick(["Windows", "Mac", "Linux"])}) ${pick(browsers)}`,
          deviceType: pick(devices),
          browser: pick(browsers),
          operatingSystem: pick(["Windows 11", "macOS 14", "Ubuntu 22"]),
          country: pick(countries),
          city: pick(["Conakry", "Dakar", "Abidjan", "Paris", "New York"]),
          loginStatus: isSuccess ? "success" : "failed",
          failureReason: isSuccess ? null : "Mot de passe incorrect",
          sessionId: isSuccess ? `sess_${Math.random().toString(36).substring(2, 12)}` : null,
        },
      });
    }
  }
  const loginCount = await prisma.userLoginHistory.count();
  console.log(`✅ ${loginCount} entrées d'historique de connexion\n`);

  // ─── 16. Audit Logs ───────────────────────────────────────────────────────
  console.log("📋 Création des logs d'audit...");
  const auditEvents = [
    { table: "clients",  action: "create" as AuditAction },
    { table: "orders",   action: "create" as AuditAction },
    { table: "orders",   action: "update" as AuditAction },
    { table: "order_payments", action: "create" as AuditAction },
    { table: "invoices", action: "create" as AuditAction },
    { table: "invoices", action: "update" as AuditAction },
    { table: "measurements", action: "create" as AuditAction },
    { table: "measurements", action: "update" as AuditAction },
    { table: "expenses", action: "create" as AuditAction },
    { table: "clients",  action: "update" as AuditAction },
    { table: "articles", action: "delete" as AuditAction },
  ];

  const sampleClientIds = clients.slice(0, 10).map((c) => c.id);
  const sampleOrderIds  = orders.slice(0, 15).map((o) => o.id);

  for (let i = 0; i < 80; i++) {
    const evt  = pick(auditEvents);
    const uid  = pick(userIds);
    const recordId = evt.table === "clients"  ? pick(sampleClientIds)
                   : evt.table === "orders"   ? pick(sampleOrderIds)
                   : `record-${rand(1, 100)}`;
    await prisma.auditLog.create({
      data: {
        userId: uid,
        tableName: evt.table,
        recordId,
        action: evt.action,
        newValues: evt.action !== "delete" ? { updated_at: new Date().toISOString() } : null,
        oldValues: evt.action === "update"  ? { updated_at: daysAgo(1).toISOString() } : null,
        ipAddress: pick(ips),
        actionDate: daysAgo(rand(0, 90)),
      },
    });
  }
  const auditCount = await prisma.auditLog.count();
  console.log(`✅ ${auditCount} entrées d'audit\n`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  const [
    cliCt, artCt, ordCt, payCt, invCt, expCt, mesCt
  ] = await Promise.all([
    prisma.client.count(), prisma.article.count(), prisma.order.count(),
    prisma.orderPayment.count(), prisma.invoice.count(), prisma.expense.count(),
    prisma.measurement.count(),
  ]);

  console.log("═══════════════════════════════════════════════");
  console.log("🎉 SEED QA TERMINÉ AVEC SUCCÈS");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Clients         : ${cliCt}`);
  console.log(`  Articles        : ${artCt}`);
  console.log(`  Commandes       : ${ordCt}`);
  console.log(`  Paiements       : ${payCt}`);
  console.log(`  Factures        : ${invCt}`);
  console.log(`  Dépenses        : ${expCt}`);
  console.log(`  Mesures         : ${mesCt}`);
  console.log(`  Audit logs      : ${auditCount}`);
  console.log(`  Login history   : ${loginCount}`);
  console.log("───────────────────────────────────────────────");
  console.log("🔑 COMPTES DE TEST (mot de passe: Dazzling2024!)");
  console.log("  admin@dazzling.com    → Administrateur");
  console.log("  manager@dazzling.com  → Manager");
  console.log("  cashier@dazzling.com  → Comptable");
  console.log("  tailor@dazzling.com   → Tailleur");
  console.log("═══════════════════════════════════════════════");
}

// ─── Helper: build status history progression ────────────────────────────────
function buildStatusHistory(finalStatus: OrderStatus, orderDate: Date, changedById: string) {
  const progression: OrderStatus[] = [
    "brouillon", "confirmee", "mesures_prises", "tissu_achete",
    "coupe", "couture", "essayage", "retouches", "finition",
    "pret_livraison", "livree",
  ];
  const finalIdx = finalStatus === "annulee" ? 2 : progression.indexOf(finalStatus);
  const steps = progression.slice(0, finalIdx + 1);
  if (finalStatus === "annulee") steps.push("annulee");

  return steps.map((status, idx) => ({
    oldStatus: idx === 0 ? null : steps[idx - 1],
    newStatus: status,
    changedById,
    changedAt: daysLater(orderDate, idx * rand(3, 8)),
    note: idx === 0 ? "Commande créée" : null,
  }));
}

// ─── Helper: create payments for an order ────────────────────────────────────
async function createPaymentsForOrder(
  order: { id: string; clientId: string; currencyId: string; sellingPrice: number; orderDate: Date },
  mode: "full" | "partial" | "advance",
  adminId: string,
  cashierId: string,
): Promise<number> {
  const price = order.sellingPrice;
  const method = pick(["cash", "mobile_money", "wave", "orange_money", "bank_transfer", "card"] as PaymentType[]);
  let totalPaid = 0;

  if (mode === "advance") {
    const advance = round2(price * (rand(20, 40) / 100));
    await prisma.orderPayment.create({
      data: {
        paymentNumber: nextPay(),
        receiptNumber: nextRec(),
        orderId: order.id,
        paymentType: "acompte_initial",
        amountOriginal: advance,
        currencyId: order.currencyId,
        paymentDate: daysLater(order.orderDate, rand(0, 3)),
        paymentMethod: method,
        createdById: cashierId,
      },
    });
    totalPaid = advance;
  } else if (mode === "partial") {
    const advance = round2(price * (rand(30, 50) / 100));
    const secondPmt = round2(price * (rand(20, 30) / 100));
    await prisma.orderPayment.create({
      data: {
        paymentNumber: nextPay(),
        receiptNumber: nextRec(),
        orderId: order.id,
        paymentType: "acompte_initial",
        amountOriginal: advance,
        currencyId: order.currencyId,
        paymentDate: daysLater(order.orderDate, rand(0, 3)),
        paymentMethod: method,
        createdById: cashierId,
      },
    });
    if (rand(0, 1) === 0) {
      await prisma.orderPayment.create({
        data: {
          paymentNumber: nextPay(),
          receiptNumber: nextRec(),
          orderId: order.id,
          paymentType: "acompte",
          amountOriginal: secondPmt,
          currencyId: order.currencyId,
          paymentDate: daysLater(order.orderDate, rand(7, 20)),
          paymentMethod: pick(["cash", "mobile_money", "wave"] as PaymentType[]),
          createdById: cashierId,
        },
      });
      totalPaid = round2(advance + secondPmt);
    } else {
      totalPaid = advance;
    }
  } else {
    // full payment — acompte + solde
    const advance = round2(price * (rand(30, 60) / 100));
    const solde   = round2(price - advance);
    await prisma.orderPayment.create({
      data: {
        paymentNumber: nextPay(),
        receiptNumber: nextRec(),
        orderId: order.id,
        paymentType: "acompte_initial",
        amountOriginal: advance,
        currencyId: order.currencyId,
        paymentDate: daysLater(order.orderDate, rand(0, 3)),
        paymentMethod: method,
        createdById: cashierId,
      },
    });
    await prisma.orderPayment.create({
      data: {
        paymentNumber: nextPay(),
        receiptNumber: nextRec(),
        orderId: order.id,
        paymentType: "paiement_final",
        amountOriginal: solde,
        currencyId: order.currencyId,
        paymentDate: daysLater(order.orderDate, rand(20, 50)),
        paymentMethod: pick(["cash", "mobile_money", "wave", "bank_transfer"] as PaymentType[]),
        label: "Solde à la livraison",
        createdById: cashierId,
      },
    });
    totalPaid = price;
  }
  return totalPaid;
}

main()
  .catch((e) => { console.error("❌ Erreur seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
