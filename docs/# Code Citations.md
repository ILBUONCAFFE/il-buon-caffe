# Code Citations

## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
```


## License: unknown
https://github.com/rgllm/rgllm.com/blob/d30825d0a18ac867bf62f7534a1707291a10f36a/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  response.headers.set(
    'Content-Security-Policy
```


## License: MIT
https://github.com/tszhong0411/honghong.me/blob/131e93e38d0e9a15e56ed8bd7e978efe3461dd91/pages/_middleware.ts

```


Świetnie że działa! Zróbmy pełny audyt. Sprawdzę każdy plik auth systemu:

Teraz sprawdzę proxy, formularz logowania, schemat DB, env:

Teraz formularz i stronę logowania:

Sprawdzę jeszcze cookies, env, i czy hasła nie są gdzieś logowane:

---

## 🔒 Audyt Bezpieczeństwa Auth — Il Buon Caffè

### Ocena ogólna: **7.2 / 10** — solidna baza, ale kilka krytycznych luk

---

### ✅ Co jest dobrze (nie ruszać)

| Element | Implementacja | Ocena |
|---------|---------------|-------|
| bcrypt hash | 12 rounds, limit 50 znaków | ✅ A |
| JWT HS256 | jose, 7 dni TTL | ✅ A |
| Cookie config | httpOnly, secure(prod), sameSite=strict, path=/admin | ✅ A |
| Account lockout | 10 prób → 30 min lock | ✅ A |
| Rate limiting IP | 5 prób / 15 min | ✅ B+ |
| Timing-safe login | Dummy hash when user not found | ✅ A |
| Generic errors | "Nieprawidłowy email lub hasło" — brak email enumeration | ✅ A |
| Edge guard (proxy.ts) | JWT verify na edge, redirect do /admin/login | ✅ A |
| Server-side error logging | `console.error` z kontekstem | ✅ B |

---

### 🔴 KRYTYCZNE — naprawić natychmiast

#### 1. Ten sam JWT Secret w dev i prod + ten sam co JWT_SECRET API

````env
# filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\.env
# PROBLEM: oba identyczne — kto złamie jeden, ma oba
JWT_SECRET=38c5f922...
ADMIN_JWT_SECRET=38c5f922...  ← IDENTYCZNY!
````

**Ryzyko:** Kompromitacja jednego klucza = dostęp do wszystkiego.

**Fix:** Wygeneruj **osobny** secret dla admina:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Wklej nowy do `ADMIN_JWT_SECRET` w obu plikach `.env`.

---

#### 2. Brak CSRF protection na Server Action

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// PROBLEM: Server Action jest callable z dowolnej strony
// Atakujący może zrobić: fetch('/admin/login', { method: 'POST', body: formData })
// z innej domeny jeśli użytkownik jest zalogowany
````

**Fix:** Dodaj CSRF token:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\lib\auth\csrf.ts
import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'

const CSRF_COOKIE = '__csrf'
const CSRF_SECRET = process.env.ADMIN_JWT_SECRET!

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const cookieStore = await cookies()

  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 60 * 60, // 1 godzina
  })

  return token
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(CSRF_COOKIE)?.value

  if (!stored || !token) return false

  // Timing-safe comparison
  const a = createHash('sha256').update(stored).digest('hex')
  const b = createHash('sha256').update(token).digest('hex')

  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
````

---

#### 3. Password widoczne w FormData loga (potencjalnie)

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error) // ← Jeśli error zawiera request body...
// ...existing code...
````

**Fix:** Nigdy nie loguj obiektów, które mogą zawierać hasło:

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\actions\admin-auth.ts
// ...existing code...
  } catch (error) {
    console.error('[adminLoginAction] Error:', error instanceof Error ? error.message : 'Unknown error')
// ...existing code...
````

---

#### 4. Brak `Referrer-Policy` i security headers

````typescript
// filepath: c:\Users\User\Documents\1PROJEKTY\Il Buon Caffe\apps\web\src\proxy.ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET

// ...existing code...

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers — DODAJ na każdy response
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // nowoczesne przeglądarki — CSP zamiast tego
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  response.headers.set(
    'Content-Security-Policy
```

