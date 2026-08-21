-- CreateEnum
CREATE TYPE "app_module" AS ENUM (
  'clients',
  'mesures',
  'articles',
  'commandes',
  'depenses',
  'paiements',
  'factures',
  'rapports',
  'taux_de_change',
  'notifications',
  'utilisateurs',
  'parametres'
);

-- CreateTable
CREATE TABLE "user_module_permissions" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID         NOT NULL,
    "module"     "app_module" NOT NULL,
    "can_view"   BOOLEAN      NOT NULL DEFAULT false,
    "can_create" BOOLEAN      NOT NULL DEFAULT false,
    "can_edit"   BOOLEAN      NOT NULL DEFAULT false,
    "can_delete" BOOLEAN      NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "user_module_permissions_user_id_module_key"
    ON "user_module_permissions"("user_id", "module");

-- AddForeignKey
ALTER TABLE "user_module_permissions"
    ADD CONSTRAINT "user_module_permissions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
