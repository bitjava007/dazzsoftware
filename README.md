# Dazzling Tailor ERP

Système de gestion complet pour atelier de couture — interface entièrement en français.

## Stack technique

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **ORM**: Prisma
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tables**: TanStack Table
- **PDF**: pdf-lib
- **Excel**: SheetJS
- **i18n**: next-intl (français)

## Fonctionnalités

- Gestion des clients et mesures
- Workflow de production (12 statuts de commande)
- Gestion des dépenses (catégorisées)
- Paiements clients avec reçus
- Facturation PDF
- Dashboard financier avec graphiques
- Taux de change multi-devises (USD, XOF, EUR, CDF)
- Historique des connexions
- Audit trail complet
- RBAC (admin, manager, comptable, tailleur)

## Installation

### 1. Cloner et installer

```bash
git clone <repo>
cd dazzsoftware
npm install
```

### 2. Configurer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez le fichier `prisma/migrations/001_init/migration.sql`
3. Récupérez vos clés API dans **Settings > API**

### 3. Variables d'environnement

Copiez `.env.example` vers `.env` et remplissez :

```bash
cp .env.example .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### 4. Générer le client Prisma

```bash
npm run db:generate
```

### 5. Initialiser les données de démo

```bash
npm run db:seed
```

### 6. Lancer en développement

```bash
npm run dev
```

Accédez à [http://localhost:3000](http://localhost:3000)

## Déploiement

### Vercel (Frontend)

```bash
vercel deploy
```

Configurez les variables d'environnement dans le dashboard Vercel.

### Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL PostgreSQL avec pgbouncer |
| `DIRECT_URL` | URL PostgreSQL directe |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase |

## Pages disponibles

| Route | Description |
|---|---|
| `/connexion` | Page de connexion |
| `/dashboard` | Tableau de bord principal |
| `/clients` | Liste et gestion des clients |
| `/clients/[id]` | Profil client détaillé |
| `/mesures` | Fiches de mesures |
| `/articles` | Catalogue des articles |
| `/commandes` | Liste des commandes |
| `/commandes/nouvelle` | Créer une commande |
| `/commandes/[id]` | Détail commande + workflow |
| `/depenses` | Gestion des dépenses |
| `/paiements` | Paiements clients |
| `/factures` | Facturation |
| `/rapports` | Rapports et exports |
| `/utilisateurs` | Gestion des utilisateurs |
| `/parametres` | Configuration |

## Structure du projet

```
src/
├── app/                    # Routes Next.js App Router
│   ├── connexion/          # Page de connexion
│   ├── dashboard/          # Tableau de bord
│   ├── clients/            # Gestion clients
│   ├── commandes/          # Commandes
│   ├── depenses/           # Dépenses
│   ├── paiements/          # Paiements
│   ├── factures/           # Factures
│   ├── rapports/           # Rapports
│   ├── mesures/            # Mesures
│   ├── articles/           # Articles
│   ├── utilisateurs/       # Utilisateurs
│   ├── parametres/         # Parametres
│   └── api/                # API Routes
├── actions/                # Server Actions
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── layout/             # Sidebar, Header, ProtectedLayout
├── hooks/                  # Custom hooks (useToast)
├── i18n/                   # Configuration next-intl
├── lib/                    # Utilitaires
│   └── supabase/           # Clients Supabase (client/server/admin)
└── types/                  # Types TypeScript
messages/
└── fr.json                 # Traductions françaises complètes
prisma/
├── schema.prisma           # Schema Prisma complet
├── seed.ts                 # Données de démo
└── migrations/
    └── 001_init/
        └── migration.sql   # Migration SQL Supabase
```

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `admin` | Accès complet |
| `manager` | Gestion opérationnelle |
| `accountant` | Finance, dépenses, paiements |
| `tailor` | Commandes, mesures |
| `user_basic` | Lecture seule |

## Devises supportées

- USD — Dollar américain
- XOF — Franc CFA Ouest-africain
- EUR — Euro
- CDF — Franc congolais

## Statuts de commande

brouillon → confirmee → mesures_prises → tissu_achete → coupe → couture → essayage → retouches → finition → pret_livraison → livree

---

Développé pour les ateliers de couture.
