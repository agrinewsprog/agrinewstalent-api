# FASE 1: AUTENTICACIÓN COMPLETA

## ✅ IMPLEMENTACIÓN COMPLETADA

### 📊 Prisma Schema (FASE 1)

**Enums:**
- `Role`: STUDENT, COMPANY, UNIVERSITY, SUPER_ADMIN
- `UserStatus`: ACTIVE, PENDING_VERIFICATION, SUSPENDED

**Modelos:**
- `User` - Usuario principal con email, password hash, role, status
- `StudentProfile` - Perfil de estudiante (one-to-one con User)
- `CompanyProfile` - Perfil de empresa (one-to-one con User)
- `UniversityProfile` - Perfil de universidad (one-to-one con User)
- `RefreshToken` - Tokens de sesión hasheados

### 🔐 Sistema de Autenticación

**Características implementadas:**
- ✅ Registro por rol (crea User + Profile correspondiente)
- ✅ Login con email + password
- ✅ Access Token JWT (15 minutos)
- ✅ Refresh Token JWT (7 días)
- ✅ Refresh tokens hasheados en DB (bcrypt)
- ✅ Cookies httpOnly, sameSite=lax, secure=false (dev)
- ✅ Validación completa con Zod
- ✅ Hash de passwords con bcrypt
- ✅ Middleware de autenticación (authMiddleware)
- ✅ Middleware de autorización por roles (roleMiddleware)

### 📁 Estructura de Archivos

```
src/
├── modules/
│   └── auth/
│       ├── auth.dto.ts          ✅ Validación Zod con refinements
│       ├── auth.repository.ts   ✅ Acceso a datos (Prisma)
│       ├── auth.service.ts      ✅ Lógica de negocio + hash tokens
│       ├── auth.controller.ts   ✅ Manejo de requests
│       └── auth.routes.ts       ✅ Definición de endpoints
├── common/
│   ├── middlewares/
│   │   ├── auth.middleware.ts   ✅ Decode JWT y set req.user
│   │   ├── role.middleware.ts   ✅ Check roles (RBAC)
│   │   ├── validate.middleware.ts
│   │   └── error.middleware.ts
│   └── utils/
│       ├── password.util.ts     ✅ Hash bcrypt
│       ├── jwt.util.ts          ✅ Generate/verify tokens
│       └── cookie.util.ts       ✅ httpOnly, sameSite=lax
└── config/
    ├── env.ts
    └── database.ts
```

## 🚀 ENDPOINTS DISPONIBLES

### POST /api/auth/register
Registra un nuevo usuario y crea su perfil según el rol.

**Body:**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "role": "STUDENT",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validación por rol:**
- `STUDENT`: requiere `firstName` y `lastName`
- `COMPANY`: requiere `companyName`
- `UNIVERSITY`: requiere `universityName`
- `SUPER_ADMIN`: no requiere campos adicionales

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "STUDENT",
    "status": "PENDING_VERIFICATION",
    "createdAt": "2026-02-18T...",
    "updatedAt": "2026-02-18T..."
  }
}
```

**Cookies seteadas:**
- `accessToken` (httpOnly, 15 min)
- `refreshToken` (httpOnly, 7 días)

---

### POST /api/auth/login
Inicia sesión con email y password.

**Body:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "STUDENT",
    "status": "ACTIVE"
  }
}
```

**Cookies seteadas:**
- `accessToken` (httpOnly, 15 min)
- `refreshToken` (httpOnly, 7 días)

---

### POST /api/auth/refresh
Renueva el access token usando el refresh token.

**Requiere:** Cookie `refreshToken`

**Response:**
```json
{
  "message": "Tokens refreshed successfully"
}
```

**Proceso:**
1. Lee refresh token de cookie
2. Verifica JWT
3. Busca tokens del usuario en DB
4. Compara con bcrypt contra versiones hasheadas
5. Si válido, genera nuevos tokens
6. Elimina token viejo, guarda nuevo hasheado
7. Setea nuevas cookies

---

### POST /api/auth/logout
Cierra sesión eliminando el refresh token.

**Requiere:** Cookie `refreshToken`

**Response:**
```json
{
  "message": "Logout successful"
}
```

**Proceso:**
1. Lee refresh token de cookie
2. Busca y elimina de DB
3. Limpia cookies

---

### GET /api/auth/me
Obtiene los datos del usuario autenticado.

**Requiere:** Cookie `accessToken`

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "createdAt": "2026-02-18T...",
    "updatedAt": "2026-02-18T..."
  }
}
```

---

## 🔒 SEGURIDAD IMPLEMENTADA

### Passwords
- Hash con bcrypt (10 salt rounds)
- Nunca se devuelven en responses

### JWT Tokens
- **Access Token:**
  - Duración: 15 minutos
  - Guardado en cookie httpOnly
  - Firmado con `JWT_ACCESS_SECRET`
  
- **Refresh Token:**
  - Duración: 7 días
  - Guardado en cookie httpOnly
  - Hasheado en base de datos con bcrypt
  - Firmado con `JWT_REFRESH_SECRET`

### Cookies
```typescript
{
  httpOnly: true,        // No accesible desde JavaScript
  secure: false,         // false en dev, true en prod (HTTPS)
  sameSite: 'lax',      // Protección CSRF
  path: '/',
}
```

### Middlewares

**authMiddleware** (`authenticate`):
```typescript
// Uso:
router.get('/protected', authenticate, controller.method);

// Decodifica JWT del accessToken cookie
// Setea req.user con: { userId, email, role }
```

**roleMiddleware** (`authorize`):
```typescript
// Uso:
router.post('/admin', authenticate, authorize(Role.SUPER_ADMIN), ...);
router.post('/offer', authenticate, authorize(Role.COMPANY, Role.UNIVERSITY), ...);

// Verifica que req.user.role esté en los roles permitidos
```

---

## 🧪 PRUEBAS

### 1. Registrar estudiante
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@student.com",
    "password": "password123",
    "role": "STUDENT",
    "firstName": "John",
    "lastName": "Doe"
  }' \
  -c cookies.txt
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@student.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### 3. Ver perfil (requiere auth)
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### 4. Refresh token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 5. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

## 🔧 CONFIGURACIÓN

### Variables de entorno (.env)
```env
DATABASE_URL="mysql://root:password@localhost:3306/agrinews_talent"
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Iniciar proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar MySQL
docker-compose up -d

# 3. Generar Prisma Client
npm run prisma:generate

# 4. Crear tablas
npm run prisma:migrate

# 5. Iniciar servidor
npm run dev
```

---

## 📝 VALIDACIONES ZOD

### Register
- Email válido
- Password mínimo 6 caracteres
- Role debe ser uno de: STUDENT, COMPANY, UNIVERSITY, SUPER_ADMIN
- Validación condicional según role:
  - STUDENT → requiere firstName + lastName
  - COMPANY → requiere companyName
  - UNIVERSITY → requiere universityName

### Login
- Email válido
- Password no vacío

---

## 🗄️ BASE DE DATOS

### Tabla: User
```sql
id          INT PRIMARY KEY AUTO_INCREMENT
email       VARCHAR(255) UNIQUE NOT NULL
password    VARCHAR(255) NOT NULL  -- bcrypt hash
role        ENUM('STUDENT', 'COMPANY', 'UNIVERSITY', 'SUPER_ADMIN')
status      ENUM('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED')
createdAt   DATETIME
updatedAt   DATETIME
```

### Tabla: StudentProfile
```sql
id           INT PRIMARY KEY AUTO_INCREMENT
userId       INT UNIQUE -- FK a User
firstName    VARCHAR(255)
lastName     VARCHAR(255)
phoneNumber  VARCHAR(255) NULL
city         VARCHAR(255) NULL
country      VARCHAR(255) NULL
resumeUrl    VARCHAR(255) NULL
linkedinUrl  VARCHAR(255) NULL
githubUrl    VARCHAR(255) NULL
bio          TEXT NULL
skills       TEXT NULL
createdAt    DATETIME
updatedAt    DATETIME
```

### Tabla: CompanyProfile
```sql
id          INT PRIMARY KEY AUTO_INCREMENT
userId      INT UNIQUE -- FK a User
companyName VARCHAR(255)
industry    VARCHAR(255) NULL
size        VARCHAR(255) NULL
website     VARCHAR(255) NULL
description TEXT NULL
logoUrl     VARCHAR(255) NULL
city        VARCHAR(255) NULL
country     VARCHAR(255) NULL
createdAt   DATETIME
updatedAt   DATETIME
```

### Tabla: UniversityProfile
```sql
id             INT PRIMARY KEY AUTO_INCREMENT
userId         INT UNIQUE -- FK a User
universityName VARCHAR(255)
city           VARCHAR(255) NULL
country        VARCHAR(255) NULL
website        VARCHAR(255) NULL
description    TEXT NULL
logoUrl        VARCHAR(255) NULL
createdAt      DATETIME
updatedAt      DATETIME
```

### Tabla: RefreshToken
```sql
id         INT PRIMARY KEY AUTO_INCREMENT
userId     INT -- FK a User
token      TEXT -- bcrypt hash del JWT
expiresAt  DATETIME
createdAt  DATETIME
```

---

## ✨ CARACTERÍSTICAS DESTACADAS

1. **Refresh tokens hasheados**: Los JWT refresh tokens se hashean con bcrypt antes de guardarse en DB
2. **Validación por rol**: Zod valida que cada role tenga los campos de perfil requeridos
3. **Cookies seguras**: httpOnly previene XSS, sameSite=lax previene CSRF
4. **RBAC flexible**: Sistema de roles con middleware authorize que acepta múltiples roles
5. **Limpieza automática**: Al refresh, se elimina el token viejo
6. **Errores específicos**: Mensajes claros para cada tipo de error de autenticación

---

## 🎯 SIGUIENTE FASE

La Fase 1 está completa. Para las siguientes fases, puedes agregar:

- Módulo de usuarios (CRUD, cambio de password, etc.)
- Módulo de ofertas de trabajo
- Módulo de aplicaciones
- Módulo de programas universitarios
- Notificaciones
- etc.

Todos los módulos pueden usar los middlewares `authenticate` y `authorize` creados en esta fase.
