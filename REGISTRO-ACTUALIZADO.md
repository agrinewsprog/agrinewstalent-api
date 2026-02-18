# Endpoint de Registro Actualizado

## POST /auth/register

Endpoint actualizado para soportar registro completo de STUDENT, COMPANY y UNIVERSITY con todos los campos de perfil.

---

## 1. Registro de STUDENT

### Campos Requeridos:
- `email` (string, email válido)
- `password` (string, mínimo 6 caracteres)
- `role` = `"STUDENT"`
- `firstName` (string, requerido)
- `lastName` (string, requerido)

### Campos Opcionales:
- `phoneNumber` (string)
- `city` (string)
- `country` (string)
- `resumeUrl` (string, URL válida)
- `linkedinUrl` (string, URL válida)
- `githubUrl` (string, URL válida)
- `bio` (string, texto largo)
- `skills` (string, texto largo)
- `dateOfBirth` (string)
- `careerField` (string)

### Ejemplo Request:

```json
{
  "email": "estudiante@mail.com",
  "password": "password123",
  "role": "STUDENT",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phoneNumber": "+34 612 345 678",
  "city": "Madrid",
  "country": "España",
  "resumeUrl": "https://drive.google.com/resume.pdf",
  "linkedinUrl": "https://linkedin.com/in/juanperez",
  "githubUrl": "https://github.com/juanperez",
  "bio": "Estudiante de Ingeniería Informática apasionado por el desarrollo web",
  "skills": "JavaScript, React, Node.js, TypeScript, SQL",
  "dateOfBirth": "1998-05-15",
  "careerField": "Ingeniería Informática"
}
```

### Ejemplo Mínimo:

```json
{
  "email": "estudiante@mail.com",
  "password": "password123",
  "role": "STUDENT",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

---

## 2. Registro de COMPANY

### Campos Requeridos:
- `email` (string, email válido)
- `password` (string, mínimo 6 caracteres)
- `role` = `"COMPANY"`
- `companyName` (string, requerido)

### Campos Opcionales:
- `industry` (string)
- `size` (string)
- `website` (string, URL válida)
- `description` (string, texto largo)
- `logoUrl` (string, URL válida)
- `city` (string)
- `country` (string)
- `foundedYear` (number, entre 1800 y año actual)
- `companySize` (string)

### Ejemplo Request:

```json
{
  "email": "contacto@techcorp.com",
  "password": "password123",
  "role": "COMPANY",
  "companyName": "TechCorp Solutions",
  "industry": "Tecnología",
  "size": "50-200 empleados",
  "website": "https://techcorp.com",
  "description": "Empresa líder en soluciones tecnológicas innovadoras",
  "logoUrl": "https://techcorp.com/logo.png",
  "city": "Barcelona",
  "country": "España",
  "foundedYear": 2015,
  "companySize": "Mediana empresa"
}
```

### Ejemplo Mínimo:

```json
{
  "email": "contacto@techcorp.com",
  "password": "password123",
  "role": "COMPANY",
  "companyName": "TechCorp Solutions"
}
```

---

## 3. Registro de UNIVERSITY

### Campos Requeridos:
- `email` (string, email válido)
- `password` (string, mínimo 6 caracteres)
- `role` = `"UNIVERSITY"`
- `universityName` (string, requerido)

### Campos Opcionales:
- `city` (string)
- `country` (string)
- `website` (string, URL válida)
- `description` (string, texto largo)
- `logoUrl` (string, URL válida)

### Ejemplo Request:

```json
{
  "email": "admin@universidadmadrid.es",
  "password": "password123",
  "role": "UNIVERSITY",
  "universityName": "Universidad de Madrid",
  "city": "Madrid",
  "country": "España",
  "website": "https://universidadmadrid.es",
  "description": "Universidad pública con más de 100 años de historia",
  "logoUrl": "https://universidadmadrid.es/logo.png"
}
```

### Ejemplo Mínimo:

```json
{
  "email": "admin@universidadmadrid.es",
  "password": "password123",
  "role": "UNIVERSITY",
  "universityName": "Universidad de Madrid"
}
```

---

## Response Exitosa (200 OK)

Para todos los roles, la respuesta incluye:

```json
{
  "user": {
    "id": 1,
    "email": "usuario@mail.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "createdAt": "2026-02-18T10:30:00.000Z",
    "updatedAt": "2026-02-18T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Errores de Validación

### Email ya existe (400 Bad Request):

```json
{
  "error": "User already exists with this email"
}
```

### Campos requeridos faltantes (400 Bad Request):

```json
{
  "error": "Required profile fields missing for the selected role"
}
```

### Email inválido:

```json
{
  "error": "Invalid email address"
}
```

### Password demasiado corto:

```json
{
  "error": "Password must be at least 6 characters"
}
```

### URL inválida:

```json
{
  "error": "Invalid URL format"
}
```

---

## Notas Importantes

1. **Creación automática de perfiles**: Al registrarse, se crea automáticamente el perfil correspondiente en la tabla relacionada:
   - STUDENT → `StudentProfile`
   - COMPANY → `CompanyProfile`
   - UNIVERSITY → `UniversityProfile`

2. **Validación con Zod**: Todos los campos se validan automáticamente según el rol seleccionado

3. **URLs opcionales**: Las URLs pueden ser strings vacíos `""` o URLs válidas

4. **foundedYear**: Puede enviarse como número o como string numérico (se convierte automáticamente)

5. **Tokens JWT**: Se generan automáticamente accessToken (15 minutos) y refreshToken (7 días)

6. **Password hasheado**: El password se hashea con bcrypt antes de guardarse en la base de datos

---

## Flujo de Registro

1. Frontend envía datos del formulario al endpoint POST /auth/register
2. Backend valida los datos con Zod según el rol
3. Se verifica que el email no exista previamente
4. Se hashea el password con bcrypt
5. Se crea el usuario en la tabla `User`
6. Se crea el perfil correspondiente en la tabla relacionada (`StudentProfile`, `CompanyProfile` o `UniversityProfile`)
7. Se generan los tokens JWT (access y refresh)
8. Se guarda el refresh token en la base de datos
9. Se devuelve el usuario (sin password) y los tokens

---

## Testing con cURL

### Student:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "estudiante@mail.com",
    "password": "password123",
    "role": "STUDENT",
    "firstName": "Juan",
    "lastName": "Pérez",
    "city": "Madrid",
    "skills": "JavaScript, React"
  }'
```

### Company:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contacto@empresa.com",
    "password": "password123",
    "role": "COMPANY",
    "companyName": "Mi Empresa",
    "industry": "Tecnología"
  }'
```

### University:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@universidad.es",
    "password": "password123",
    "role": "UNIVERSITY",
    "universityName": "Universidad de Madrid",
    "city": "Madrid"
  }'
```
