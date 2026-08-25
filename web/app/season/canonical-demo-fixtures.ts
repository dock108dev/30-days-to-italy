import type { EpisodeId } from "./manifest";

export type CanonicalDemoPath = {
  responses: readonly string[];
  expectedOutcomeId: string;
};

export const CANONICAL_DEMO_PATHS: Readonly<Record<EpisodeId, CanonicalDemoPath>> = {
  "day-00": {
    responses: ["Fuscoletti. Ho una prenotazione.", "Camera dodici, primo piano. Grazie."],
    expectedOutcomeId: "E1-O3",
  },
  "day-01": {
    responses: ["Sono Michael. Sono qui per la chiave.", "La porta verde, primo piano. Grazie."],
    expectedOutcomeId: "D01-O1",
  },
  "day-02": {
    responses: ["Vorrei pane, formaggio e acqua.", "Solo questo, senza sacchetto.", "Pago con la carta."],
    expectedOutcomeId: "D02-O1",
  },
  "day-03": {
    responses: ["Vorrei un espresso.", "Qui, grazie.", "Con la carta."],
    expectedOutcomeId: "D03-O1",
  },
  "day-04": {
    responses: ["Un lettino e un ombrellone.", "Solo un lettino e un ombrellone.", "Va bene."],
    expectedOutcomeId: "E2-O1",
  },
  "day-05": {
    responses: ["Mezzo chilo di pomodori.", "Basta così, grazie."],
    expectedOutcomeId: "D05-O1",
  },
  "day-06": {
    responses: ["Un biglietto per Amalfi, per favore.", "Solo andata.", "Dov’è la fermata?"],
    expectedOutcomeId: "D06-O1",
  },
  "day-07": {
    responses: ["Mi serve qualcosa per le punture.", "La crema, grazie."],
    expectedOutcomeId: "D07-O1",
  },
  "day-08": {
    responses: ["Come funziona?", "Macchina quattro, gettoniera due.", "Devo premere il pulsante verde?"],
    expectedOutcomeId: "D08-O1",
  },
  "day-09": {
    responses: ["Quanto tempo ci vuole?", "Quanto costa il traghetto?", "Prendo il traghetto delle nove e trenta."],
    expectedOutcomeId: "D09-O1",
  },
  "day-10": {
    responses: ["Vorrei la pasta con l'insalata.", "Non le patate. L'insalata, per favore."],
    expectedOutcomeId: "D10-O1",
  },
  "day-11": {
    responses: ["Non c'è acqua calda.", "Da stamattina.", "Martedì dalle nove alle undici va bene."],
    expectedOutcomeId: "D11-O1",
  },
  "day-12": {
    responses: ["C'è un'alternativa?", "Prendo il posto all'ombra da otto euro."],
    expectedOutcomeId: "D12-O1",
  },
  "day-13": {
    responses: ["Il cappuccino è sbagliato e non ho ordinato la spremuta.", "Va bene, corregga entrambi.", "Pago due euro e cinquanta con la carta."],
    expectedOutcomeId: "E3-O1",
  },
  "day-14": {
    responses: ["Qual è la fermata provvisoria?", "Piazza Alta, di fronte alla farmacia?"],
    expectedOutcomeId: "D14-O1",
  },
  "day-15": {
    responses: ["Scusi, non ho chiesto la borsa extra.", "Pago quattro euro con la carta."],
    expectedOutcomeId: "D15-O1",
  },
  "day-16": {
    responses: ["Non ho il documento con me.", "Ho il codice di consegna.", "Quattro uno sette due."],
    expectedOutcomeId: "D16-O1",
  },
  "day-17": {
    responses: ["Aveva detto martedì mattina.", "Il problema continua.", "Oggi alle diciotto va bene."],
    expectedOutcomeId: "D17-O1",
  },
  "day-18": {
    responses: ["C'è un'alternativa?", "Qual è la differenza?", "Prendo il gel da sei euro."],
    expectedOutcomeId: "D18-O1",
  },
  "day-19": {
    responses: ["Vorrei il rimborso e l'autobus sostitutivo.", "Confermo l'autobus."],
    expectedOutcomeId: "D19-O1",
  },
  "day-20": {
    responses: ["È una soluzione temporanea?", "Quando arriva il pezzo?", "Venerdì alle dieci va bene."],
    expectedOutcomeId: "D20-O1",
  },
  "day-21": {
    responses: ["Il solito, grazie.", "Con la carta."],
    expectedOutcomeId: "E4-O1",
  },
  "day-22": {
    responses: ["Cosa mi consiglia?", "Prendo il panino caprese."],
    expectedOutcomeId: "D22-O1",
  },
  "day-23": {
    responses: ["Prendo il pacco, grazie.", "No, grazie. Devo andare."],
    expectedOutcomeId: "D23-O1",
  },
  "day-24": {
    responses: ["Allora vado via."],
    expectedOutcomeId: "D24-O1",
  },
  "day-25": {
    responses: ["Domani alle diciannove e trenta?", "Forse. Non lo so ancora."],
    expectedOutcomeId: "D25-O1",
  },
  "day-26": {
    responses: ["Preferirei un tavolo tranquillo."],
    expectedOutcomeId: "D26-O1",
  },
  "day-27": {
    responses: ["Ora l'acqua calda funziona.", "Posso avere un buono?"],
    expectedOutcomeId: "D27-O1",
  },
  "day-28": {
    responses: ["Dove devo cambiare?", "A Vietri, poi alle nove e trentacinque dal binario tre.", "Pago due euro e quaranta."],
    expectedOutcomeId: "D28-O1",
  },
  "day-29": {
    responses: ["Un espresso, grazie.", "Non lo so ancora.", "Con la carta."],
    expectedOutcomeId: "D29-O1",
  },
  "day-30": {
    responses: ["Ecco le chiavi dell'appartamento e dell'hotel.", "È tutto a posto?", "Parto domani mattina."],
    expectedOutcomeId: "D30-O1",
  },
};
