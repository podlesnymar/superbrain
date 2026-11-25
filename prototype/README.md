# Prototyp interfejsu: system obsługi klienta

Klikalny prototyp czterech głównych ekranów (Moje zadania, Klienci, Przestrzeń klienta z listami w stylu arkusza oraz Przegląd klienta), plus podgląd szablonów i administracji. Powstał na podstawie specyfikacji etapu 1.

To **prototyp bez backendu**: dane są przykładowe, żyją w pamięci przeglądarki i znikają po odświeżeniu strony. Służy do sprawdzenia wyglądu i sposobu pracy, zanim powstanie właściwa aplikacja na Cloudflare.

## Jak uruchomić

Wystarczy otworzyć `index.html` w przeglądarce. Niczego nie trzeba instalować ani budować.

Do publikacji przez GitHub Pages wskaż katalog `prototype/` jako źródło strony.

Pojedynczy plik do wysłania komuś mailem lub wrzucenia na dowolny hosting:

```
node tools/bundle.mjs      # tworzy dist/prototype.html
```

## Co można wypróbować

- **Przełącznik użytkownika** w prawym górnym rogu: Marta (administrator), Anna i Piotr (pracownicy), Jan (konto lokalne, tylko odczyt). Każdy widzi tylko swoje przestrzenie i inne menu.
- **Lista w stylu arkusza** (Klienci, wybrany klient, Listy):
  strzałki, Tab, Enter i F2 (edycja), samo pisanie zaczyna edycję, Esc anuluje, Delete czyści komórkę,
  Ctrl+C i Ctrl+V (wklejanie zakresu skopiowanego z Excela, także jako nowe wiersze),
  dwuklik na nazwie grupy zmienia ją, zwijanie grup, zaznaczanie wielu pozycji i zbiorcza zmiana statusu,
  filtr po statusie, sortowanie po nagłówku, historia zmian pozycji (ikona zegara).
- **Dodawanie listy z szablonu**, zadań z przypomnieniem, notatek, plików (ponowne wgranie tego samego pliku daje kolejną wersję).
- **Administracja:** zaproszenie konta lokalnego (z 2FA i wygasającym zaproszeniem), edycja uprawnień ról (zmiana działa od razu po przełączeniu użytkownika), dodawanie statusów.

## Struktura kodu

```
index.html          kolejność ładowania skryptów
css/styles.css      jedyny arkusz stylów
js/core/            narzędzia (util, dom, ui), magazyn stanu (store), router
js/data/seed.js     dane przykładowe
js/components/      wielokrotnego użytku: arkusz (sheet), okno zadania (taskform)
js/views/           po jednym pliku na ekran
js/app.js           powłoka (menu, wyszukiwarka), definicje tras
tools/bundle.mjs    składa wszystko w jeden plik HTML
```

Pliki to zwykłe skrypty dopisujące się do wspólnej przestrzeni nazw `CS`, więc działają bez serwera i bez narzędzi budujących. W wersji docelowej ta sama struktura przejdzie na moduły TypeScript.

## Zasady, które mają ułatwić rozbudowę

1. **Widoki nie zmieniają danych bezpośrednio.** Wszystko przechodzi przez funkcje w `js/core/store.js`. W aplikacji docelowej każda z nich stanie się wywołaniem API, a widoki zostaną bez zmian.
2. **Uprawnienia w jednym miejscu.** Funkcje `hasPerm`, `level`, `canView`, `canEditSpace` i `canManageAccess` w `store.js` są jedynym źródłem prawdy. Widoki tylko ich używają. W aplikacji docelowej te same reguły będą sprawdzane po stronie serwera.
3. **Konfiguracja w danych, nie w kodzie.** Statusy, role, uprawnienia, kategorie plików i szablony leżą w `seed.js`.
4. **Nowy ekran** to: nowy plik w `js/views/`, jedna linia w `index.html`, jedna trasa w `js/app.js` (`R.add(...)`) i ewentualnie pozycja w `NAV`.
5. **Nowe uprawnienie** to wpis w `permissions` w `seed.js` i użycie `S.hasPerm('klucz')` tam, gdzie ma działać.

## Czego prototyp celowo nie robi

Prawdziwego logowania, zapisu danych, wysyłki e-maili, pobierania plików, kopii zapasowych, przeciągania pozycji między grupami, zapisu listy jako szablonu ani edycji karty klienta. To zakres kolejnych kroków.
