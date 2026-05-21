import { PrismaClient, Role, OrderStatus, PaymentType, OrderPaymentType, InvoiceStatus, LoginStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Currencies
  const currencies = await Promise.all([
    prisma.currency.upsert({
      where: { code: "USD" },
      update: {},
      create: { code: "USD", name: "Dollar américain", symbol: "$", isActive: true },
    }),
    prisma.currency.upsert({
      where: { code: "XOF" },
      update: {},
      create: { code: "XOF", name: "Franc CFA Ouest-africain", symbol: "CFA", isActive: true },
    }),
    prisma.currency.upsert({
      where: { code: "EUR" },
      update: {},
      create: { code: "EUR", name: "Euro", symbol: "€", isActive: true },
    }),
    prisma.currency.upsert({
      where: { code: "CDF" },
      update: {},
      create: { code: "CDF", name: "Franc congolais", symbol: "FC", isActive: true },
    }),
  ]);

  const [usd, xof, eur, cdf] = currencies;
  console.log("✅ Currencies created");

  // Expense Categories
  const catMatiere = await prisma.expenseCategory.upsert({
    where: { id: "cat-matiere" },
    update: {},
    create: { id: "cat-matiere", name: "Matières premières", description: "Tissu, fil, boutons, etc." },
  });

  const catMain = await prisma.expenseCategory.upsert({
    where: { id: "cat-main" },
    update: {},
    create: { id: "cat-main", name: "Main d'œuvre", description: "Rémunération des tailleurs" },
  });

  const catCharge = await prisma.expenseCategory.upsert({
    where: { id: "cat-charge" },
    update: {},
    create: { id: "cat-charge", name: "Charges fixes", description: "Loyer, électricité, eau" },
  });

  const catEquip = await prisma.expenseCategory.upsert({
    where: { id: "cat-equip" },
    update: {},
    create: { id: "cat-equip", name: "Équipement", description: "Machines, outils" },
  });

  // Subcategories
  await Promise.all([
    prisma.expenseSubcategory.upsert({
      where: { id: "sub-tissu" },
      update: {},
      create: { id: "sub-tissu", categoryId: catMatiere.id, name: "Tissu", description: "Achats de tissu" },
    }),
    prisma.expenseSubcategory.upsert({
      where: { id: "sub-fil" },
      update: {},
      create: { id: "sub-fil", categoryId: catMatiere.id, name: "Fil & accessoires", description: "Fil, boutons, fermetures" },
    }),
    prisma.expenseSubcategory.upsert({
      where: { id: "sub-salaire" },
      update: {},
      create: { id: "sub-salaire", categoryId: catMain.id, name: "Salaires", description: "Salaires mensuels" },
    }),
    prisma.expenseSubcategory.upsert({
      where: { id: "sub-loyer" },
      update: {},
      create: { id: "sub-loyer", categoryId: catCharge.id, name: "Loyer", description: "Loyer atelier" },
    }),
    prisma.expenseSubcategory.upsert({
      where: { id: "sub-elec" },
      update: {},
      create: { id: "sub-elec", categoryId: catCharge.id, name: "Électricité", description: "Factures électricité" },
    }),
  ]);
  console.log("✅ Expense categories created");

  // Settings
  await prisma.settings.upsert({
    where: { id: "default-settings" },
    update: {},
    create: {
      id: "default-settings",
      companyName: "Dazzling Tailor",
      address: "123 Avenue de la Mode, Kinshasa",
      phone: "+243 00 000 0000",
      email: "contact@dazzlingtailor.com",
      defaultCurrencyId: usd.id,
      invoicePrefix: "FACT-",
      receiptPrefix: "RECU-",
      language: "fr",
    },
  });
  console.log("✅ Settings created");

  // Exchange Rates
  await Promise.all([
    prisma.exchangeRate.upsert({
      where: { id: "rate-usd-xof" },
      update: {},
      create: {
        id: "rate-usd-xof",
        fromCurrencyId: usd.id,
        toCurrencyId: xof.id,
        rate: 600,
        effectiveDate: new Date(),
        source: "Manuel",
        isActive: true,
      },
    }),
    prisma.exchangeRate.upsert({
      where: { id: "rate-eur-usd" },
      update: {},
      create: {
        id: "rate-eur-usd",
        fromCurrencyId: eur.id,
        toCurrencyId: usd.id,
        rate: 1.08,
        effectiveDate: new Date(),
        source: "Manuel",
        isActive: true,
      },
    }),
    prisma.exchangeRate.upsert({
      where: { id: "rate-usd-cdf" },
      update: {},
      create: {
        id: "rate-usd-cdf",
        fromCurrencyId: usd.id,
        toCurrencyId: cdf.id,
        rate: 2800,
        effectiveDate: new Date(),
        source: "Manuel",
        isActive: true,
      },
    }),
  ]);
  console.log("✅ Exchange rates created");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
