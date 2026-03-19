# 🗄️ Setup Bazy Danych - Neon PostgreSQL

## Szybki Start

### 1. Utwórz bazę w Neon

1. Zarejestruj się na [neon.tech](https://console.neon.tech/)
2. Utwórz nowy projekt
3. Skopiuj connection string (znajdziesz w dashboardzie Neon)

### 2. Skonfiguruj zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu projektu:

```bash
# Copy from .env.example
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/database?sslmode=require"
```

### 3. Zainstaluj zależności

```bash
# Z głównego katalogu projektu
pnpm install
```

### 4. Wygeneruj i wdróż schemat

```bash
# Z katalogu apps/web
cd apps/web

# Wygeneruj migrację (opcjonalnie - dla dokumentacji zmian)
pnpm db:generate

# Wdróż schemat bezpośrednio na bazę
pnpm db:push
```

### 5. Zasilij bazę danymi

```bash
# Z katalogu apps/web
pnpm db:seed
```

### 6. (Opcjonalnie) Uruchom Drizzle Studio

```bash
pnpm db:studio
```

Otworzy się przeglądarka z wizualnym edytorem bazy danych.

---

## Struktura Bazy Danych

### Tabele

| Tabela | Opis |
|--------|------|
| `categories` | Kategorie produktów (Kawa, Wina, Słodycze, Delikatesy) |
| `products` | Produkty sklepu (SKU jako Primary Key) |

### Schemat `categories`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | `serial` | Primary Key |
| `name` | `varchar(255)` | Nazwa kategorii |
| `slug` | `varchar(255)` | URL-friendly slug (unique) |
| `description` | `text` | Opis kategorii |
| `image_url` | `varchar(500)` | URL zdjęcia |
| `is_active` | `boolean` | Czy aktywna |
| `sort_order` | `integer` | Kolejność wyświetlania |

### Schemat `products`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `sku` | `varchar(50)` | **Primary Key** (np. "COFFEE-001") |
| `slug` | `varchar(255)` | URL-friendly slug (unique) |
| `name` | `varchar(255)` | Nazwa produktu |
| `description` | `text` | Opis |
| `category_id` | `integer` | FK do categories |
| `price` | `decimal(10,2)` | Cena w PLN |
| `compare_at_price` | `decimal(10,2)` | Cena przed promocją |
| `stock` | `integer` | Stan magazynowy |
| `image_url` | `varchar(500)` | URL głównego zdjęcia |
| `origin` | `varchar(255)` | Pochodzenie (np. "Etiopia") |
| `year` | `varchar(10)` | Rocznik (dla win) |
| `weight` | `integer` | Waga w gramach |
| `is_active` | `boolean` | Czy aktywny |
| `is_new` | `boolean` | Badge "Nowość" |
| `is_featured` | `boolean` | Polecany |

---

## Komendy

| Komenda | Opis |
|---------|------|
| `pnpm db:generate` | Generuje pliki migracji SQL |
| `pnpm db:push` | Wdraża zmiany schematu na bazę |
| `pnpm db:seed` | Zasilanie bazy przykładowymi danymi |
| `pnpm db:studio` | Uruchom wizualny edytor Drizzle Studio |

---

## Troubleshooting

### Błąd: "DATABASE_URL is not defined"

Upewnij się, że:
1. Plik `.env` istnieje w głównym katalogu projektu (nie w `apps/web`)
2. Connection string jest poprawny

### Błąd: "SSL required"

Neon wymaga SSL. Upewnij się, że URL zawiera `?sslmode=require`.

### Błąd podczas seed'owania

Jeśli seed zawodzi z powodu istniejących danych, najpierw wyczyść tabele:

```sql
-- W Drizzle Studio lub Neon SQL Editor
TRUNCATE products, categories RESTART IDENTITY CASCADE;
```
