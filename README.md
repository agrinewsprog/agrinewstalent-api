# AgriNews Talent API

API REST para plataforma de gestión de talento con Express + TypeScript + MySQL + Prisma.

## 📋 Stack Tecnológico

- **Node.js** + **TypeScript**
- **Express** (Framework web)
- **MySQL** (Base de datos)
- **Prisma** (ORM)
- **JWT** (Autenticación con access + refresh tokens)
- **Zod** (Validación de datos)
- **Bcrypt** (Hash de contraseñas)
- **Helmet** (Seguridad HTTP)
- **CORS** (Control de acceso)
- **Rate Limiting** (Protección contra abuso)

## 🏗️ Arquitectura

```
src/
├── server.ts              # Punto de entrada
├── app.ts                 # Configuración de Express
├── config/                # Configuración (env, database)
├── common/                # Código compartido
│   ├── middlewares/       # Auth, Role, Validate, Error
│   └── utils/             # JWT, Password, Cookie
├── routes/                # Rutas principales
└── modules/               # Módulos de negocio
    ├── auth/
    ├── offers/
    └── ...
```

Cada módulo sigue la estructura:
- `*.routes.ts` - Definición de rutas
- `*.controller.ts` - Controladores (manejo de req/res)
- `*.service.ts` - Lógica de negocio
- `*.repository.ts` - Acceso a datos (Prisma)
- `*.dto.ts` - DTOs y validación (Zod)

## 🚀 Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="mysql://root:password@localhost:3306/agrinews_talent"

JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
```

### 3. Levantar MySQL con Docker

```bash
docker-compose up -d
```

Verificar que MySQL está corriendo:

```bash
docker ps
```

### 4. Generar cliente de Prisma

```bash
npm run prisma:generate
```

### 5. Ejecutar migraciones de base de datos

```bash
npm run prisma:migrate
```

Esto creará todas las tablas en la base de datos.

### 6. Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

## 📡 Endpoints Principales

### Autenticación (`/api/auth`)

```
POST   /api/auth/register    - Registrar usuario
POST   /api/auth/login       - Iniciar sesión
POST   /api/auth/refresh     - Refrescar access token
POST   /api/auth/logout      - Cerrar sesión
GET    /api/auth/me          - Obtener usuario actual (requiere auth)
```

### Ofertas (`/api/offers`)

```
GET    /api/offers           - Listar ofertas
GET    /api/offers/:id       - Ver detalle de oferta
POST   /api/offers           - Crear oferta (COMPANY)
PUT    /api/offers/:id       - Actualizar oferta (COMPANY)
DELETE /api/offers/:id       - Eliminar oferta (COMPANY)
POST   /api/offers/:id/publish - Publicar oferta (COMPANY)
POST   /api/offers/:id/close   - Cerrar oferta (COMPANY)
```

## 🔐 Autenticación

El sistema usa JWT con dos tokens:

1. **Access Token** (httpOnly cookie, 15 min)
   - Se usa en cada request
   - Corta duración

2. **Refresh Token** (httpOnly cookie, 7 días)
   - Se guarda en base de datos
   - Se usa para renovar access token

### Ejemplo de registro:

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123",
  "role": "STUDENT",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Ejemplo de login:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

## 👥 Roles (RBAC)

- `STUDENT` - Estudiantes
- `COMPANY` - Empresas
- `UNIVERSITY` - Universidades
- `SUPER_ADMIN` - Administrador del sistema

## 🗄️ Base de Datos

El schema de Prisma incluye:

- **User** - Usuarios del sistema
- **StudentProfile** - Perfil de estudiante
- **CompanyProfile** - Perfil de empresa
- **UniversityProfile** - Perfil de universidad
- **JobOffer** - Ofertas de trabajo
- **JobApplication** - Aplicaciones a ofertas
- **Program** - Programas universitarios
- **Course** - Cursos
- **Notification** - Notificaciones
- **Agreement** - Convenios
- **RefreshToken** - Tokens de sesión

Ver `prisma/schema.prisma` para el modelo completo.

## 🛠️ Comandos útiles

```bash
# Desarrollo
npm run dev              # Iniciar en modo desarrollo

# Build
npm run build            # Compilar TypeScript
npm start                # Ejecutar versión compilada

# Prisma
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:migrate   # Ejecutar migraciones
npm run prisma:studio    # Abrir Prisma Studio (GUI)

# Docker
docker-compose up -d     # Iniciar MySQL
docker-compose down      # Detener MySQL
docker-compose logs      # Ver logs
```

## 📝 Próximos pasos

Para completar la API, implementa los módulos faltantes siguiendo el mismo patrón que `auth` y `offers`:

- `users` - Gestión de usuarios
- `students` - Perfil de estudiantes
- `companies` - Perfil de empresas
- `universities` - Perfil de universidades
- `applications` - Aplicaciones a ofertas
- `programs` - Programas universitarios
- `courses` - Cursos
- `notifications` - Notificaciones
- `agreements` - Convenios

Cada módulo debe incluir:
1. DTOs con validación Zod
2. Repository para acceso a datos
3. Service con lógica de negocio
4. Controller para manejar requests
5. Routes con middlewares de auth y role

## 🔒 Seguridad

- ✅ Cookies httpOnly (previene XSS)
- ✅ CORS configurado
- ✅ Helmet para headers de seguridad
- ✅ Rate limiting
- ✅ Validación de inputs con Zod
- ✅ Passwords hasheados con bcrypt
- ✅ JWT con refresh tokens
- ✅ RBAC (Role-Based Access Control)

## 📄 Licencia

ISC
