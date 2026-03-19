// ============================================
// WINE ENCYCLOPEDIA - GLOSSARY
// ============================================

import { GlossaryTerm } from '@/types/wineEncyclopedia';

export const WINE_GLOSSARY: GlossaryTerm[] = [
  // A
  { id: 'acidity', term: 'Acidity', termPl: 'Kwasowość', definition: 'Jeden z głównych elementów struktury wina. Odpowiednia kwasowość daje świeżość i żywotność, zbyt wysoka - cierpkość, zbyt niska - płaskość.', category: 'Degustacja' },
  { id: 'aeration', term: 'Aeration', termPl: 'Aeracja', definition: 'Proces napowietrzania wina, najczęściej przez dekantację. Pozwala uwolnić aromaty i zmiękczyć taniny.', category: 'Serwowanie' },
  { id: 'aftertaste', term: 'Aftertaste', termPl: 'Posmak', definition: 'Smak pozostający w ustach po połknięciu wina. Długi, przyjemny posmak jest oznaką wysokiej jakości.', category: 'Degustacja', relatedTerms: ['finish'] },
  { id: 'aging', term: 'Aging', termPl: 'Dojrzewanie', definition: 'Proces starzenia wina w beczkach, butelkach lub zbiornikach. Rozwija złożoność i zmiękcza taniny.', category: 'Produkcja' },
  { id: 'aoc', term: 'AOC / AOP', termPl: 'Apelacja kontrolowana', definition: 'Appellation d\'Origine Contrôlée/Protégée - francuski system ochrony nazwy pochodzenia. Określa szczepy, metody produkcji i dozwolone plony.', category: 'Klasyfikacje' },
  { id: 'appellation', term: 'Appellation', termPl: 'Apelacja', definition: 'Prawnie zdefiniowany region winiarski o określonych zasadach produkcji.', category: 'Regiony' },
  { id: 'assemblage', term: 'Assemblage', termPl: 'Assemblage', definition: 'Proces łączenia win z różnych szczepów, winnic lub roczników w celu stworzenia finalnej cuvée. Kluczowy w Bordeaux i Champagne.', category: 'Produkcja' },
  
  // B
  { id: 'balance', term: 'Balance', termPl: 'Równowaga', definition: 'Harmonia między wszystkimi elementami wina: kwasowością, taninami, alkoholem, słodyczą i owocowością.', category: 'Degustacja' },
  { id: 'barrique', term: 'Barrique', termPl: 'Barrique', definition: 'Standardowa beczka dębowa o pojemności 225 litrów (Bordeaux) lub 228 litrów (Burgundia).', category: 'Produkcja' },
  { id: 'biodynamic', term: 'Biodynamic', termPl: 'Biodynamiczny', definition: 'Holistyczna metoda uprawy oparta na filozofii Rudolfa Steinera, wykorzystująca kalendarz księżycowy i specjalne preparaty.', category: 'Uprawa' },
  { id: 'blind-tasting', term: 'Blind Tasting', termPl: 'Degustacja ślepa', definition: 'Degustacja bez znajomości tożsamości wina. Eliminuje wpływ uprzedzeń na ocenę.', category: 'Degustacja' },
  { id: 'body', term: 'Body', termPl: 'Ciało', definition: 'Odczucie "wagi" wina w ustach. Od lekkiego (woda) do pełnego (śmietana). Zależy od alkoholu, ekstraktu i gliceryny.', category: 'Degustacja' },
  { id: 'botrytis', term: 'Botrytis Cinerea', termPl: 'Szlachetna pleśń', definition: 'Grzyb atakujący winogrona w wilgotnych warunkach. W kontrolowanych warunkach koncentruje cukry i aromaty (Sauternes, Tokaji).', category: 'Produkcja' },
  { id: 'bouquet', term: 'Bouquet', termPl: 'Bukiet', definition: 'Kompleks aromatów trzeciorzędowych rozwijających się podczas dojrzewania wina w butelce.', category: 'Degustacja', relatedTerms: ['aroma'] },
  { id: 'brett', term: 'Brettanomyces', termPl: 'Brett', definition: 'Dzikie drożdże powodujące kontrowersyjne aromaty (stajnia, pot koński). W niskich ilościach może dodawać złożoności.', category: 'Wady' },
  { id: 'brut', term: 'Brut', termPl: 'Brut', definition: 'Kategoria słodkości win musujących - bardzo wytrawne, mniej niż 12 g/l cukru resztkowego.', category: 'Klasyfikacje' },

  // C
  { id: 'chaptalisation', term: 'Chaptalization', termPl: 'Chaptalizacja', definition: 'Dodawanie cukru do moszczu przed fermentacją w celu zwiększenia poziomu alkoholu. Legalne w niektórych regionach.', category: 'Produkcja' },
  { id: 'charmat', term: 'Charmat Method', termPl: 'Metoda Charmat', definition: 'Metoda produkcji win musujących, gdzie druga fermentacja odbywa się w zbiornikach ciśnieniowych (Prosecco).', category: 'Produkcja' },
  { id: 'climat', term: 'Climat', termPl: 'Climat', definition: 'Burgundzki termin na precyzyjnie wydzieloną parcelę winnicową o unikalnych cechach terroir.', category: 'Regiony' },
  { id: 'clone', term: 'Clone', termPl: 'Klon', definition: 'Genetycznie identyczna odmiana uzyskana przez wegetatywne rozmnażanie. Różne klony tego samego szczepu mają odmienne cechy.', category: 'Uprawa' },
  { id: 'corked', term: 'Corked', termPl: 'Skorkowane', definition: 'Wino skażone TCA (trichloroanizol) z wadliwego korka. Pachnie mokrym kartonem i traci owocowość.', category: 'Wady' },
  { id: 'cru', term: 'Cru', termPl: 'Cru', definition: 'Termin oznaczający winnicę lub region o uznanej jakości. Grand Cru to najwyższa klasyfikacja.', category: 'Klasyfikacje' },
  { id: 'cuvee', term: 'Cuvée', termPl: 'Cuvée', definition: 'Blend win lub specjalna partia. W Champagne może oznaczać najlepszy sok z pierwszego tłoczenia.', category: 'Produkcja' },

  // D
  { id: 'decanting', term: 'Decanting', termPl: 'Dekantacja', definition: 'Przelewanie wina do karafki w celu napowietrzenia lub oddzielenia osadu od wina starszego.', category: 'Serwowanie' },
  { id: 'demi-sec', term: 'Demi-Sec', termPl: 'Demi-Sec', definition: 'Lekko słodkie (np. w Champagne 32-50 g/l cukru).', category: 'Klasyfikacje' },
  { id: 'disgorgement', term: 'Disgorgement', termPl: 'Degorgaż', definition: 'Usunięcie osadu drożdżowego z szyjki butelki szampana po remuage\'u.', category: 'Produkcja' },
  { id: 'docg', term: 'DOCG', termPl: 'DOCG', definition: 'Denominazione di Origine Controllata e Garantita - najwyższy poziom klasyfikacji włoskiej.', category: 'Klasyfikacje' },
  { id: 'dosage', term: 'Dosage', termPl: 'Dosage', definition: 'Płyn dodawany po degorgażu szampana, określający poziom słodkości (Brut, Extra Brut itp.).', category: 'Produkcja' },

  // E
  { id: 'eiswein', term: 'Eiswein', termPl: 'Wino lodowe', definition: 'Wino ze winogron zamrożonych naturalnie na winorośli. Koncentruje cukry i kwasy.', category: 'Typy win' },
  { id: 'elevation', term: 'Élevage', termPl: 'Élevage', definition: 'Proces dojrzewania wina po fermentacji - w beczkach, zbiornikach lub butelkach.', category: 'Produkcja' },
  { id: 'extract', term: 'Extract', termPl: 'Ekstrakt', definition: 'Suma suchych składników wina (bez cukru). Wina o wysokim ekstrakcie są bogate i pełne.', category: 'Degustacja' },

  // F
  { id: 'fermentation', term: 'Fermentation', termPl: 'Fermentacja', definition: 'Proces biochemiczny, w którym drożdże przekształcają cukry w alkohol i CO₂.', category: 'Produkcja' },
  { id: 'fining', term: 'Fining', termPl: 'Klarowanie', definition: 'Dodawanie substancji (bentonit, białko jaja) wiążących cząstki zmętniające wino przed filtracją.', category: 'Produkcja' },
  { id: 'finish', term: 'Finish', termPl: 'Finisz', definition: 'Końcowe wrażenie smakowe po połknięciu. Długość finiszu jest miernikiem jakości.', category: 'Degustacja' },
  { id: 'fortified', term: 'Fortified Wine', termPl: 'Wino wzmacniane', definition: 'Wino z dodanym alkoholem (spirytusem), np. Porto, Sherry, Madeira. Zazwyczaj 15-22% alk.', category: 'Typy win' },
  { id: 'free-run', term: 'Free-Run', termPl: 'Samociek', definition: 'Najczystszy sok spływający z prasy bez nacisku. Najwyższa jakość.', category: 'Produkcja' },

  // G-H
  { id: 'grand-cru', term: 'Grand Cru', termPl: 'Grand Cru', definition: 'Najwyższa klasyfikacja winnic w Burgundii i Alzacji. W Bordeaux - część nazw château.', category: 'Klasyfikacje' },
  { id: 'horizontal-tasting', term: 'Horizontal Tasting', termPl: 'Degustacja horyzontalna', definition: 'Porównanie win z tego samego rocznika od różnych producentów.', category: 'Degustacja' },

  // L-M
  { id: 'lees', term: 'Lees (Sur Lie)', termPl: 'Osad drożdżowy', definition: 'Martwe drożdże opadające na dno po fermentacji. Kontakt z osadem (sur lie) dodaje złożoności.', category: 'Produkcja' },
  { id: 'maceration', term: 'Maceration', termPl: 'Maceracja', definition: 'Kontakt soku ze skórkami, nasionami i ewentualnie szypułkami. Ekstrahuje barwnik, taniny i aromaty.', category: 'Produkcja' },
  { id: 'magnum', term: 'Magnum', termPl: 'Magnum', definition: 'Butelka 1,5 litra (dwie standardowe butelki). Idealna do długiego leżakowania.', category: 'Serwowanie' },
  { id: 'malolactic', term: 'Malolactic Fermentation', termPl: 'Fermentacja malolaktyczna', definition: 'Przekształcenie kwaśnego kwasu jabłkowego w łagodny kwas mlekowy. Zmiękcza wino.', category: 'Produkcja' },
  { id: 'minerality', term: 'Minerality', termPl: 'Mineralność', definition: 'Kontrowersyjny termin opisujący wrażenia skaliste, solne lub kredowe w winie.', category: 'Degustacja' },
  { id: 'must', term: 'Must', termPl: 'Moszcz', definition: 'Niesfermentowany sok winogronowy ze skórkami, nasionami i ewentualnie szypułkami.', category: 'Produkcja' },

  // N-O
  { id: 'natural-wine', term: 'Natural Wine', termPl: 'Wino naturalne', definition: 'Wina produkowane z minimalną interwencją - bez lub z minimalnymi dodatkami, dzikie drożdże.', category: 'Typy win' },
  { id: 'négociant', term: 'Négociant', termPl: 'Negocjant', definition: 'Kupiec kupujący winogrona lub wino od farmerów i sprzedający pod własną marką.', category: 'Produkcja' },
  { id: 'new-oak', term: 'New Oak', termPl: 'Nowy dąb', definition: 'Beczka używana po raz pierwszy. Nadaje intensywniejsze aromaty wanilii, tostu i przypraw.', category: 'Produkcja' },
  { id: 'noble-rot', term: 'Noble Rot', termPl: 'Szlachetna pleśń', definition: 'Botrytis cinerea w korzystnych warunkach. Patrz: Botrytis.', category: 'Produkcja', relatedTerms: ['botrytis'] },
  { id: 'nose', term: 'Nose', termPl: 'Nos', definition: 'Aromat wina oceniany węchowo. Inaczej: bukiet, bouquet.', category: 'Degustacja' },
  { id: 'oak', term: 'Oak', termPl: 'Dąb', definition: 'Drewno używane do beczek. Francuski dąb - delikatny, amerykański - intensywniejszy (kokos, wanilia).', category: 'Produkcja' },
  { id: 'oxidation', term: 'Oxidation', termPl: 'Oksydacja', definition: 'Nadmierny kontakt wina z tlenem prowadzący do utraty świeżości i brązowienia.', category: 'Wady' },

  // P-R
  { id: 'palate', term: 'Palate', termPl: 'Podniebienie', definition: 'Smak wina oceniany w ustach. Również umiejętność rozróżniania smaków.', category: 'Degustacja' },
  { id: 'premier-cru', term: 'Premier Cru', termPl: 'Premier Cru', definition: 'Druga najwyższa klasyfikacja w Burgundii (po Grand Cru). W Bordeaux 1855 - najwyższa (Premiers Grands Crus Classés).', category: 'Klasyfikacje' },
  { id: 'punt', term: 'Punt', termPl: 'Wklęsłość w butelce', definition: 'Wgłębienie na dnie butelki. Wzmacnia strukturę, pomaga zbierać osad.', category: 'Serwowanie' },
  { id: 'residual-sugar', term: 'Residual Sugar', termPl: 'Cukier resztkowy', definition: 'Cukier pozostający po fermentacji. Wina wytrawne: <4 g/l, słodkie: >45 g/l.', category: 'Degustacja' },
  { id: 'reserve', term: 'Reserve / Reserva', termPl: 'Rezerwa', definition: 'W Hiszpanii - określony czas dojrzewania. W innych krajach - często marketingowy termin bez definicji prawnej.', category: 'Klasyfikacje' },

  // S
  { id: 'sommelier', term: 'Sommelier', termPl: 'Sommelier', definition: 'Profesjonalista od wina w restauracji. Odpowiada za kartę win, serwis i parowanie z potrawami.', category: 'Profesja' },
  { id: 'structure', term: 'Structure', termPl: 'Struktura', definition: 'Szkielet wina tworzony przez taniny (czerwone), kwasowość, alkohol i ekstrakt.', category: 'Degustacja' },
  { id: 'sulfites', term: 'Sulfites', termPl: 'Siarczyny', definition: 'Związki siarki dodawane jako konserwant i antyoksydant. Prawie wszystkie wina je zawierają.', category: 'Produkcja' },

  // T
  { id: 'tannins', term: 'Tannins', termPl: 'Taniny', definition: 'Polifenole ze skórek, nasion i dębu. Dają wrażenie ściągania (suche w ustach). Z czasem zmiękczają.', category: 'Degustacja' },
  { id: 'terroir', term: 'Terroir', termPl: 'Terroir', definition: 'Suma wpływów miejsca: gleba, klimat, ekspozycja, tradycja. Koncept kluczowy dla win premium.', category: 'Uprawa' },
  { id: 'tca', term: 'TCA', termPl: 'TCA', definition: '2,4,6-trichloroanizol - związek powodujący wadę korkową. Próg wyczuwalności: 2 ng/l.', category: 'Wady' },
  { id: 'traditional-method', term: 'Traditional Method', termPl: 'Metoda tradycyjna', definition: 'Metoda produkcji szampana z drugą fermentacją w butelce (méthode traditionnelle, champenoise).', category: 'Produkcja' },

  // V-Y
  { id: 'varietal', term: 'Varietal', termPl: 'Wino odmianowe', definition: 'Wino etykietowane nazwą szczepu (Chardonnay, Merlot). Często w Nowym Świecie.', category: 'Typy win' },
  { id: 'vertical-tasting', term: 'Vertical Tasting', termPl: 'Degustacja wertykalna', definition: 'Porównanie różnych roczników tego samego wina od jednego producenta.', category: 'Degustacja' },
  { id: 'vineyard', term: 'Vineyard', termPl: 'Winnica', definition: 'Parcela obsadzona winoroslą. Może być pojedynczą czy częścią większej posiadłości.', category: 'Uprawa' },
  { id: 'vinification', term: 'Vinification', termPl: 'Winifikacja', definition: 'Cały proces produkcji wina od winogron do butelki.', category: 'Produkcja' },
  { id: 'vintage', term: 'Vintage', termPl: 'Rocznik', definition: 'Rok zbiorów winogron. W niektórych regionach kluczowy dla jakości.', category: 'Klasyfikacje' },
  { id: 'viticulture', term: 'Viticulture', termPl: 'Winogrodnictwo', definition: 'Uprawa winorośli - wszystkie prace w winnicy przed zbiorami.', category: 'Uprawa' },
  { id: 'volatile-acidity', term: 'Volatile Acidity', termPl: 'Kwasowość lotna', definition: 'Kwasy octowe powstające w wyniku działania bakterii. W niskich stężeniach dopuszczalne.', category: 'Wady' },
  { id: 'yeast', term: 'Yeast', termPl: 'Drożdże', definition: 'Mikroorganizmy przeprowadzające fermentację. Kultywowane zapewniają kontrolę, dzikie - autentyczność.', category: 'Produkcja' },
  { id: 'yield', term: 'Yield', termPl: 'Plon', definition: 'Ilość winogron lub wina z jednostki powierzchni winnicy. Niższe plony = często wyższa jakość.', category: 'Uprawa' },
];

export const getGlossaryTermsByCategory = (category: string): GlossaryTerm[] => {
  return WINE_GLOSSARY.filter((term) => term.category === category);
};

export const searchGlossary = (query: string): GlossaryTerm[] => {
  const lowered = query.toLowerCase();
  return WINE_GLOSSARY.filter(
    (term) =>
      term.term.toLowerCase().includes(lowered) ||
      term.termPl?.toLowerCase().includes(lowered) ||
      term.definition.toLowerCase().includes(lowered)
  );
};

export const getGlossaryTerm = (id: string): GlossaryTerm | undefined => {
  return WINE_GLOSSARY.find((term) => term.id === id);
};

export const GLOSSARY_CATEGORIES = [
  'Degustacja',
  'Produkcja',
  'Klasyfikacje',
  'Serwowanie',
  'Regiony',
  'Typy win',
  'Uprawa',
  'Wady',
  'Profesja',
];
