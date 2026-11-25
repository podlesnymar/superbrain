# Superbrain: system obsługi klienta

Wewnętrzny system dla działu obsługi klienta i wsparcia technicznego: przestrzenie klientów z uprawnieniami, pliki, listy uruchomionych elementów (jak arkusz) z historią zmian i szablonami, notatki, zadania z przypomnieniami i backup. Docelowo działa na Cloudflare (Workers, D1, R2).

## Stan prac

| Katalog | Co zawiera |
| --- | --- |
| `prototype/` | Klikalny prototyp interfejsu bez backendu. Instrukcja uruchomienia i opis struktury w `prototype/README.md`. |

Aplikacja docelowa powstanie w kolejnym katalogu obok prototypu, według zasad ze specyfikacji: osobne moduły, uprawnienia w jednym miejscu, migracje bazy, zdarzenia, integracje za interfejsami i jedno wersjonowane API.
