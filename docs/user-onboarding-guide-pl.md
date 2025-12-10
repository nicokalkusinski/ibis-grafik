# Grafik Recepcji — Kompletny Przewodnik dla Użytkownika

Ten przewodnik krok po kroku prowadzi nową osobę przez cały program do układania grafików recepcji. Wystarczy podstawowa znajomość Excela. Dowiesz się, co robi każdy przycisk, jak działa generator, co oznaczają opcje, jak działają blokady i preferencje, oraz jak eksportować i przywracać dane.

## Co potrafi aplikacja
- Układa miesięczny grafik zmian dziennych i nocnych dla recepcji.
- Równoważy obciążenie, uwzględnia preferencje i limity godzin/streaków zmian.
- Pozwala ręcznie poprawiać komórki, blokować to, co ma zostać, i ponownie generować resztę.
- Eksportuje do PNG (obraz) i JSON (kopie/backup); zapisuje dane w przeglądarce.

## Słownik i legenda
- **D** — Zmiana dzienna.  
- **N** — Zmiana nocna.  
- **U** — Urlop/wolne (ustawiane ręcznie).  
- **Puste** — Brak przydziału / wolne.  
- **Kłódka 🔒/🔓** — Blokuje komórkę/wiersz/kolumnę przed zmianą przy ponownym generowaniu.  
- **Żółte podświetlenia** — Kolumny/komórki z brakami lub naruszeniem zasady (streak, blokada, N→D itd.).
- **Szare podświetlenia** - Komórki ktore zostaly zablokowane i nie beda sie zmieniac przy ponownej generacji grafiku.

## Szybki start (pierwsze użycie)
1) Otwórz aplikację (interfejs jest po polsku).  
2) Kliknij **Zarządzaj kadrą** → uzupełnij przynajmniej jedną osobę (Imię i nazwisko, Maks. godziny, Preferencje) → **Dodaj recepcjonistę**. Powtórz dla całego zespołu.  
3) Opcjonalnie w **Opcje grafiku** ustaw limity streaków (Maks. dni/nocy pod rząd) i zaznacz **Używaj kolorów dla pracowników**, jeśli nadajesz kolory.  
4) Wybierz miesiąc i rok u góry, potem kliknij **Generuj grafik**.  
5) Sprawdź ostrzeżenia, popraw komórki (D = dzień, N = noc, U = urlop/wolne, puste = wolne) i zablokuj to, co ma zostać.  
6) Kliknij ponownie **Generuj grafik** po poprawkach; zablokowane pola nie zmienią się.  
7) Eksportuj: **Zapisz PNG** (obraz) lub **Eksport JSON** (kopia). **Import JSON** przywraca zapis.

## Spacer po ekranie
- **Górny pasek**: wybór miesiąca/roku i **Generuj grafik** (tworzy/odświeża tabelę).
- **Panel grafiku**:
  - **Zarządzaj kadrą**: lista osób i formularz.
  - **Opcje grafiku**: limity streaków, włączenie kolorów w tabeli.
  - **Zablokuj wszystko / Odblokuj wszystko**: blokada/odblokowanie całej siatki.
  - **Zapisz PNG / Eksport JSON / Import JSON**: eksporty/import.
  - Tabela: w każdej komórce jest lista wyboru i mała kłódka.
  - Uchwyt przeciągania (⋮⋮) w wierszu: zmiana kolejności osób (zapisywana).
- **Ostrzeżenia**: lista problemów (brak obsady, wymuszony blok, streaki, N→D, nadgodziny).
- **Podsumowania**: godziny i liczniki per osoba (dzień/noc/urlop/nadgodziny/uwagi).

## Dodawanie i edycja osób (Zarządzaj kadrą)
- **Imię i nazwisko**: wymagane, pojawia się w tabeli i eksporcie.
- **Maks. godziny / miesiąc**: docelowy limit. Generator stara się go nie przekraczać; po zaznaczeniu **Nie przekraczaj limitu godzin** staje się twardym limitem (wolne pola zamiast nadgodzin).
- **Długość zmiany**: stałe 12h dla wszystkich (nie można zmienić).
- **Preferencje zmian**:
  - *Bez preferencji* — zbalansowane.
  - *Woli dni* / *Woli noce* — preferuje, ale może obie.
  - *Tylko dni* / *Tylko noce* — twardy zakaz drugiej zmiany.
- **Kolor pracownika**: opcjonalny. Włącz **Używaj kolorów dla pracowników**, aby pokolorować cały wiersz.
- **Nie pracuje w (zmiany)**: zaznacz D lub N pod dniami tygodnia (Pn–Nd), by zablokować te zmiany cyklicznie. Generator unika; jeśli nie ma alternatywy, może złamać blokadę i zgłosi ostrzeżenie.
- **Nie przekraczaj limitu godzin**: czyni maks. godziny sztywnym limitem.
- **Edytuj/Usuń**: **Edytuj** zmienia dane, **Usuń** kasuje osobę. Zmiany odświeżają bieżący grafik.
- **Kolejność**: przeciągnij uchwyt ⋮⋮ w tabeli; kolejność zapisuje się i wpływa na eksport.

## Opcje grafiku (Opcje grafiku)
- **Maks. dni pod rząd (D)**: limit kolejnych zmian dziennych.
- **Maks. nocy pod rząd (N)**: limit kolejnych zmian nocnych.
- **Maks. zmian pod rząd (D lub N)**: łączny limit kolejnych zmian dowolnego typu.
- **Używaj kolorów dla pracowników**: koloruje wiersze zgodnie z kolorem osoby.
- Zapis opcji odświeża ostrzeżenia; użyj **Generuj grafik**, aby nowe limity weszły w życie przy nowych przydziałach.

## Praca z tabelą grafiku
- W każdej komórce wybierz:
  - **D** lub **N** — przydział zmiany,
  - **U** — urlop/wolne,
  - puste — wolne.
  - Zmiany od razu aktualizują ostrzeżenia i podsumowania.
- **Blokady**:
  - Każda komórka ma własną kłódkę: blokuje tylko ten slot.
  - Kolumna: kłódka w nagłówku nad dniem blokuje ten dzień dla wszystkich.
  - Wiersz: kłódka obok nazwiska blokuje cały miesiąc dla tej osoby.
  - **Zablokuj wszystko / Odblokuj wszystko**: cała siatka jednym kliknięciem.
  - Zablokowane miejsca zostają dokładnie takie same przy ponownym generowaniu (łącznie z ręcznymi D/N/U).
- **Przeciąganie**: uchwytem ⋮⋮ zmieniasz kolejność osób; zapisuje się automatycznie.
- **Weekend**: sobota/niedziela są cieniowane, ale działają jak zwykłe dni.

## Jak generator podejmuje decyzje
- Dąży do obsadzenia każdego dnia jedną zmianą **D** i jedną **N**.
- Najpierw respektuje zablokowane komórki (zostawia wpisane D/N/U).
- Stara się nie przekraczać limitów godzin; jeśli zaznaczono “Nie przekraczaj limitu godzin”, nigdy nie wyjdzie ponad limit tej osoby. U innych może lekko przekroczyć, by zapewnić obsadę.
- **Tylko dni/Tylko noce** są bezwzględne; **Woli** wpływa na punktację, ale pozwala obie zmiany.
- Unika przejścia **N→D** dla tej samej osoby (noc, potem od razu dzień).
- Unika zablokowanych dni/zmian; jeśli nie ma innego kandydata, może wymusić i doda ostrzeżenie.
- Równoważy obciążenie: celuje w podobne sumy godzin i “odpoczynek” po przerwie.
- Równoważy liczbę dni vs. nocy dla każdej osoby.
- Przestrzega limitów streaków z **Maks. dni/nocy/zmian pod rząd**; buduje krótkie sekwencje w tych granicach i oznacza przekroczenia.

## Ostrzeżenia i podświetlenia
- Rodzaje: braki obsady, sekwencje noc→dzień, złamanie blokady dnia/zmiany, przekroczenie limitu streaków oraz podsumowania (zero godzin, nadgodziny lub ponad limit osoby).
- **Brak obsady**: w dacie brakuje zmiany D i/lub N (podświetlona kolumna).
- **N→D**: ta sama osoba ma noc, potem dzień (obydwie komórki podświetlone).
- **Blokada dnia/zmiany**: osoba wpisana w zablokowany dzień/zmianę (komórka podświetlona; opis w ostrzeżeniach).
- **Streak**: przekroczony limit kolejnych zmian (D, N albo łącznie).
- **Podsumowanie**: zero godzin, >168h/miesiąc lub > limitu tej osoby.
- **Kiedy się pojawiają**: od razu po wygenerowaniu grafiku i przy każdej zmianie komórki (D/N/U/puste) lub blokady—nie trzeba ręcznie odświeżać.

## Eksport, import i zapisywanie
- **Autozapis**: pracownicy, ustawienia, kolory i blokady są w pamięci przeglądarki na tym urządzeniu. Wyczyszczenie danych strony usuwa je.
- **Eksport JSON**: przenośna kopia (pracownicy, grafik, miesiąc/rok, blokady, kolory). Użyj do migracji na inny komputer lub wersjonowania.
- **Import JSON**: wczytuje zapis; miesiąc/rok dostosują się do pliku, przywróci też grafik.
- **Zapisz PNG**: zapisuje obraz tabeli z podsumowaniami (do druku/maila).
- Wskazówka: po większych ręcznych zmianach wyeksportuj JSON, by mieć kopię przed testem nowych ustawień.

## Typowe scenariusze i wskazówki
- **Bezpieczne ponowne układanie**: zablokuj zatwierdzone komórki, potem **Generuj grafik**, by reszta się ułożyła.
- **Urlopy/wolne**: ustaw **U**, zablokuj, a potem generuj resztę.
- **Nadgodziny**: zwiększ limit godzin (lub odznacz “Nie przekraczaj limitu godzin”), albo dodaj pracowników.
- **Braki obsady**: dodaj osoby, poluzuj blokady albo limity streaków, potem regeneruj.
- **Kolorowe wiersze**: ustaw kolor przy osobie i włącz **Używaj kolorów dla pracowników**, by szybciej skanować tabelę.
- **Nowy start**: usuń osoby i odśwież, albo wyczyść dane strony (resetuje zapisane ustawienia i pracowników).

## FAQ
- **Co znaczą litery?** D = dzień, N = noc, U = urlop/wolne, puste = wolne.
- **Czemu kolumna jest żółta?** Brakuje obsady D i/lub N tego dnia.
- **Czemu zablokowany dzień został wpisany?** Nie było alternatywy; program wymusił i podał ostrzeżenie — odblokuj/edytuj, jeśli trzeba.
- **Jak zamrozić osobę/zmianę?** Zablokuj wiersz (kłódka w nagłówku) albo pojedyncze komórki przed ponownym generowaniem.
- **Czy zmienię długość zmiany?** Nie, wszystkie zmiany mają 12h.
- **Gdzie są dane?** W pamięci przeglądarki; użyj eksportu/importu JSON, by przenieść lub zrobić kopię. Strona nie wysyła/pobiera żadnych danych.
- **Jak przenieść dane na inny komputer?** Na starym komputerze wybierz **Eksport JSON** i zapisz plik, a na nowym otwórz aplikację i użyj **Import JSON** — przeniosą się miesiąc/rok, pracownicy, kolory, blokady i cały grafik.
