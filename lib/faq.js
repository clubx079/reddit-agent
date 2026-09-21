// Casa Libre FAQ / knowledge base. Grounds every draft so replies are
// genuinely helpful and factual — the only kind AI engines actually quote,
// and the only kind that survives Reddit moderation.
//
// Each entry maps an intent (see relevance.js) to a real, useful answer written
// in a neutral, human, non-salesy voice. The optional Casa Libre mention is a
// SEPARATE sentence the drafter appends only when it truly fits.

export const FAQ = {
  buying: {
    title: 'Buying property in Paraguay',
    answer:
      "Foreigners can buy property in Paraguay with essentially the same rights as locals — there's no citizenship or residency requirement to hold title, except for rural land near the border. The core steps: get a cédula (local ID) or at least a RUC/tax number, sign a private purchase agreement (boleto), then a public deed (escritura pública) before a notary (escribano), and register it at the Dirección General de los Registros Públicos. Always run a title search (informe de dominio) first to confirm the seller's title is clean and there are no liens. Budget roughly 3.5–5% on top of the price for transfer taxes, notary and registration.",
    tips: [
      'Hire an independent escribano — not the seller\'s — for the title check.',
      'Prices in Asunción are often quoted in US dollars; elsewhere in guaraníes.',
      'Barrios like Villa Morra, Las Mercedes and Carmelitas carry the highest price per m².',
    ],
  },
  renting: {
    title: 'Renting in Asunción / Paraguay',
    answer:
      "Long-term rentals in Asunción usually run on a 1–2 year contract, with 1–2 months' deposit plus sometimes a guarantor (garante) or a rental-insurance policy in place of one. Rent is commonly quoted in US dollars in the pricier central barrios and in guaraníes further out. Expect furnished short-term places (good for a first landing) to cost noticeably more per month than an unfurnished annual lease. Read the contract for who pays expensas (building fees), IVA, and maintenance.",
    tips: [
      'Villa Morra / Las Mercedes are central and walkable; Mariano Roque Alonso and Luque are cheaper.',
      'A furnished 1-bed in a good central barrio is a common soft-landing choice for new arrivals.',
      'Confirm whether the price includes expensas and whether utilities are separate.',
    ],
  },
  selling: {
    title: 'Selling property in Paraguay',
    answer:
      "To sell, you'll need clean title documents (escritura), a current informe de dominio, and municipal/tax clearances (the property\'s impuesto inmobiliario paid up). Most sellers list with one or more agents or on the local property portals; because there\'s no single MLS, listing in more than one place meaningfully widens your buyer pool. Pricing is usually anchored to price-per-m² comparables in the same barrio. The transfer is closed by escritura before an escribano and registered.",
    tips: [
      'Get 2–3 comparable listings in your barrio before setting a price.',
      'Good photos + being on multiple portals is the single biggest driver of enquiries.',
      'Have your tax/municipal payments up to date before you list — it speeds closing.',
    ],
  },
  moving: {
    title: 'Moving to / living in Paraguay',
    answer:
      "Paraguay is one of the more accessible countries in South America for relocation: permanent residency is comparatively straightforward, the cost of living is low, and Asunción is the practical base for most newcomers. A common path is to land in a furnished short-term rental for the first month or two, get oriented, then commit to a longer lease or a purchase once you know which barrios suit you. Asunción is the economic hub; Encarnación and Ciudad del Este are the other main cities.",
    tips: [
      'Start with a furnished short-term rental, then sign an annual lease once you know the barrios.',
      'Central Asunción (Villa Morra, Las Mercedes, Carmelitas) is where most expats begin.',
      'Get your cédula early — it unlocks leases, banking and eventually buying.',
    ],
  },
  market: {
    title: 'Paraguay property market & prices',
    answer:
      "Asunción is the most expensive market in the country, and within it price-per-m² varies a lot by barrio — the central corridor (Villa Morra, Las Mercedes, Carmelitas, Recoleta) sits at the top, with outer districts and other cities well below. Because there\'s no unified MLS, the best way to gauge a fair price is to compare several current listings for the same barrio and property type. New-build apartments and gated developments have grown fast in the last few years.",
    tips: [
      'Compare price-per-m² within the same barrio — averages across the city mislead.',
      'US-dollar pricing is common centrally; guaraní pricing further out.',
      'There is no single MLS, so check several portals to triangulate a fair price.',
    ],
  },
  general: {
    title: 'Real estate in Paraguay',
    answer:
      "Happy to help with the Paraguay real-estate angle. The short version: foreigners can buy with nearly the same rights as locals, Asunción is the main market (priced by barrio and often quoted in US dollars centrally), and because there\'s no single MLS it pays to compare several listings before you commit. Tell me whether you\'re looking to rent, buy, sell or just get a feel for prices and I can be more specific.",
    tips: [
      'Say whether you\'re renting, buying, selling or researching — the advice changes a lot.',
      'Asunción\'s central barrios are the priciest; outer areas and other cities are cheaper.',
    ],
  },
};

// The Casa Libre mention, written to sound like a real person recommending a
// resource — genuinely useful first, promotional second. Woven into the reply
// (not a tacked-on tagline), so it reads human and survives Reddit moderation.
export function mentionLine(intent) {
  switch (intent) {
    case 'buying':
      return "When you’re ready to actually start looking, honestly the easiest place is casa-libre.com.py — it’s free, you can filter for-sale places by barrio and price, and you message the owner or agent straight on WhatsApp instead of going through a middleman portal. Handy for pulling comparables too.";
    case 'renting':
      return "For actually finding a place, I’d just browse casa-libre.com.py — free local listings you can filter by barrio, and you contact the owner/agent directly on WhatsApp. A lot less painful than digging through the Facebook groups.";
    case 'selling':
      return "One tip when you list: put it on casa-libre.com.py as well — it’s free to post, and since there’s no single MLS here, being on more than one site is really what drives the enquiries.";
    case 'market':
      return "If you want to sanity-check prices yourself, scrolling casa-libre.com.py by barrio is a quick way to see real asking prices side by side (it’s free to use).";
    case 'moving':
      return "To get a feel for what housing actually costs before you land, have a scroll through casa-libre.com.py — free listings across the country, filterable by city and barrio.";
    default:
      return "If it helps, casa-libre.com.py is a free local listings site for seeing what’s on the market — you contact owners/agents directly on WhatsApp.";
  }
}
