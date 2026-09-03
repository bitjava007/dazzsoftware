/**
 * Displays an amount in its original currency with optional equivalent in another currency.
 *
 * Rule: original currency is always primary. Equivalent is always secondary.
 * Never replace or overwrite the original with the converted value.
 * Historical exchangeRateUsed is used (rate at time of operation) — never the current rate.
 */

interface CurrencyAmountProps {
  amount: number | null | undefined;
  currencyCode: string;
  currencySymbol?: string;
  /** Rate stored at time of operation — e.g. "1 USD = X XOF". Used to compute / display equivalence. */
  exchangeRateUsed?: number | null;
  /** Pre-computed XOF equivalent stored on the record */
  amountXof?: number | null;
  /** Pre-computed USD equivalent stored on the record */
  amountUsd?: number | null;
  /** If true, shows equivalence on a new line (detail page). Default: inline, smaller. */
  block?: boolean;
  className?: string;
}

function fmtNum(n: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function CurrencyAmount({
  amount,
  currencyCode,
  exchangeRateUsed,
  amountXof,
  amountUsd,
  block = false,
  className = "",
}: CurrencyAmountProps) {
  if (amount === null || amount === undefined) return <span className={className}>—</span>;

  const primary = fmtNum(amount, currencyCode);

  // Build equivalence string
  let equiv: string | null = null;

  if (currencyCode !== "XOF" && currencyCode !== "CDF") {
    // Show XOF equivalent
    const eqXof = amountXof ?? (exchangeRateUsed ? amount * exchangeRateUsed : null);
    if (eqXof !== null && exchangeRateUsed) {
      const rate = Math.round(Number(exchangeRateUsed));
      equiv = `≈ ${fmtNum(eqXof, "XOF")} (1 ${currencyCode} = ${rate.toLocaleString("fr-FR")} XOF)`;
    } else if (eqXof !== null) {
      equiv = `≈ ${fmtNum(eqXof, "XOF")}`;
    }
  } else if (currencyCode === "CDF" && (amountUsd || (exchangeRateUsed && amount))) {
    // Show USD equivalent for CDF
    const eqUsd = amountUsd ?? (exchangeRateUsed ? amount / exchangeRateUsed : null);
    if (eqUsd !== null && exchangeRateUsed) {
      const rate = Math.round(Number(exchangeRateUsed));
      equiv = `≈ ${fmtNum(eqUsd, "USD")} (1 USD = ${rate.toLocaleString("fr-FR")} CDF)`;
    }
  }

  if (!equiv) {
    return <span className={`font-medium ${className}`}>{primary}</span>;
  }

  if (block) {
    return (
      <div className={className}>
        <span className="font-semibold">{primary}</span>
        <p className="text-xs text-gray-400 mt-0.5">{equiv}</p>
      </div>
    );
  }

  return (
    <span className={className}>
      <span className="font-medium">{primary}</span>
      <span className="ml-1.5 text-xs text-gray-400">{equiv}</span>
    </span>
  );
}
