# GUÍA DE PRUEBAS: FASE 3 - UNIVERSIDADES Y PROGRAMAS

Guía paso a paso para probar la funcionalidad completa de universidades, programas de prácticas y postulaciones.

---

## 🛠️ REQUISITOS PREVIOS

1. **Base de datos activa:**
```powershell
docker-compose up -d
```

2. **Ejecutar migraciones:**
```powershell
npx prisma migrate deploy
```

3. **Servidor en ejecución:**
```powershell
npm run dev
```

4. **Herramienta de pruebas:** Postman, Thunder Client, o similar.

---

## 📋 ESCENARIO COMPLETO

### FASE 1: REGISTRO DE USUARIOS

#### 1.1. Registrar Universidad
**POST** `http://localhost:3000/api/auth/register`

```json
{
  "email": "admin@unmsm.edu.pe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "UNIVERSITY",
  "universityName": "Universidad Nacional Mayor de San Marcos",
  "establishedYear": "1551",
  "website": "https://unmsm.edu.pe",
  "contactEmail": "contacto@unmsm.edu.pe",
  "contactPhone": "+51 1 6197000",
  "address": "Av. Universitaria s/n, Lima",
  "city": "Lima",
  "country": "Perú"
}
```

✅ **Resultado esperado:** Status 201, mensaje de confirmación
📝 **Guardar:** `universityAccessToken` de las cookies

---

#### 1.2. Registrar Empresa
**POST** `http://localhost:3000/api/auth/register`

```json
{
  "email": "rrhh@techcorp.pe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "COMPANY",
  "companyName": "TechCorp SAC",
  "industry": "Tecnología de la Información",
  "companySize": "50-250",
  "foundedYear": "2018",
  "logoUrl": "https://example.com/techcorp-logo.png",
  "website": "https://techcorp.pe",
  "contactEmail": "rrhh@techcorp.pe",
  "contactPhone": "+51 1 5551234",
  "address": "Av. Javier Prado 123, San Isidro",
  "city": "Lima",
  "country": "Perú"
}
```

✅ **Resultado esperado:** Status 201
📝 **Guardar:** `companyAccessToken` de las cookies

---

#### 1.3. Registrar Estudiante
**POST** `http://localhost:3000/api/auth/register`

```json
{
  "email": "juan.perez@estudiante.pe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "STUDENT",
  "firstName": "Juan",
  "lastName": "Pérez García",
  "phoneNumber": "+51 987654321",
  "dateOfBirth": "2000-05-15",
  "resumeUrl": "https://example.com/juan-perez-cv.pdf",
  "linkedinUrl": "https://linkedin.com/in/juanperez",
  "githubUrl": "https://github.com/juanperez",
  "city": "Lima",
  "country": "Perú",
  "bio": "Estudiante de Ingeniería de Sistemas con pasión por el desarrollo backend",
  "skills": "JavaScript, TypeScript, Node.js, React, MySQL, Git",
  "careerField": "Ingeniería de Sistemas"
}
```

✅ **Resultado esperado:** Status 201
📝 **Guardar:** `studentAccessToken` de las cookies

---

### FASE 2: UNIVERSIDAD - CÓDIGOS DE INVITACIÓN

#### 2.1. Crear Código de Invitación
**POST** `http://localhost:3000/api/universities/me/invites`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

**Body:**
```json
{
  "maxUses": 100,
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

✅ **Resultado esperado:** Status 201, objeto `invite` con `inviteCode`
📝 **Guardar:** `inviteCode` (ej: "A1B2C3D4E5F6G7H8")

---

#### 2.2. Listar Códigos de Invitación
**GET** `http://localhost:3000/api/universities/me/invites`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** Array de invites con el código creado

---

#### 2.3. Ver Estadísticas de la Universidad
**GET** `http://localhost:3000/api/universities/me/stats`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** 
```json
{
  "totalStudents": 0,
  "totalInvites": 1,
  "activeInvites": 1
}
```

---

### FASE 3: ESTUDIANTE - CANJEAR INVITACIÓN

#### 3.1. Canjear Código de Invitación
**POST** `http://localhost:3000/api/universities/invites/redeem`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

**Body:**
```json
{
  "inviteCode": "A1B2C3D4E5F6G7H8"
}
```

✅ **Resultado esperado:** 
- Status 200
- Mensaje: "Successfully joined university"
- Objeto `membership` con datos de universidad y estudiante

---

#### 3.2. Intentar Canjear Nuevamente (debe fallar)
**POST** `http://localhost:3000/api/universities/invites/redeem`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

**Body:**
```json
{
  "inviteCode": "A1B2C3D4E5F6G7H8"
}
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Student already belongs to a university"

---

### FASE 4: UNIVERSIDAD - GESTIONAR ESTUDIANTES

#### 4.1. Ver Estudiantes de la Universidad
**GET** `http://localhost:3000/api/universities/me/students`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** 
- Array `students` con 1 estudiante (Juan Pérez)
- Incluye datos de perfil completo

---

#### 4.2. Filtrar Estudiantes Activos
**GET** `http://localhost:3000/api/universities/me/students?status=ACTIVE&search=Juan`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** Mismo estudiante filtrado

---

### FASE 5: UNIVERSIDAD - CREAR PROGRAMA

#### 5.1. Crear Programa de Prácticas
**POST** `http://localhost:3000/api/programs/universities/me/programs`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

**Body:**
```json
{
  "title": "Programa de Prácticas Profesionales 2025",
  "description": "Programa de prácticas preprofesionales para estudiantes de últimos ciclos en empresas del sector tecnológico. Los estudiantes tendrán la oportunidad de aplicar sus conocimientos en proyectos reales.",
  "startDate": "2025-03-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.000Z",
  "maxStudents": 100
}
```

✅ **Resultado esperado:** 
- Status 201
- Objeto `program` con `id`, `isActive: true`
📝 **Guardar:** `programId`

---

#### 5.2. Listar Mis Programas
**GET** `http://localhost:3000/api/programs/universities/me/programs`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** Array con el programa creado

---

### FASE 6: EMPRESA - MOSTRAR INTERÉS

#### 6.1. Ver Detalles del Programa
**GET** `http://localhost:3000/api/programs/1`

**Headers:**
```
Cookie: accessToken=<companyAccessToken>
```

✅ **Resultado esperado:** Detalles completos del programa

---

#### 6.2. Mostrar Interés en el Programa
**POST** `http://localhost:3000/api/programs/1/interest`

**Headers:**
```
Cookie: accessToken=<companyAccessToken>
```

✅ **Resultado esperado:** 
- Status 201
- Mensaje: "Interest registered successfully"
- Objeto `interest` con `status: "PENDING"`

---

#### 6.3. Intentar Crear Oferta (debe fallar - aún no aprobado)
**POST** `http://localhost:3000/api/programs/1/offers`

**Headers:**
```
Cookie: accessToken=<companyAccessToken>
```

**Body:**
```json
{
  "title": "Practicante Backend",
  "description": "Desarrollo de APIs REST",
  "workMode": "HYBRID",
  "contractType": "INTERNSHIP",
  "experienceLevel": "JUNIOR"
}
```

❌ **Resultado esperado:** 
- Status 400
- Error: "Company is not approved for this program"

---

### FASE 7: UNIVERSIDAD - APROBAR EMPRESA

#### 7.1. Ver Empresas del Programa
**GET** `http://localhost:3000/api/programs/1/companies`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** Array con TechCorp en estado PENDING

---

#### 7.2. Aprobar Empresa
**PATCH** `http://localhost:3000/api/programs/1/companies/1/status`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

**Body:**
```json
{
  "status": "APPROVED"
}
```

✅ **Resultado esperado:** 
- Status 200
- Mensaje: "Company status updated successfully"
- `status: "APPROVED"`, `reviewedAt` y `reviewedBy` rellenados

---

### FASE 8: EMPRESA - CREAR OFERTA

#### 8.1. Crear Oferta de Práctica
**POST** `http://localhost:3000/api/programs/1/offers`

**Headers:**
```
Cookie: accessToken=<companyAccessToken>
```

**Body:**
```json
{
  "title": "Practicante de Desarrollo Backend Node.js",
  "description": "Buscamos practicante para desarrollo de APIs REST con Node.js y TypeScript. Participarás en proyectos reales trabajando con tecnologías modernas.",
  "requirements": "- Cursando últimos ciclos de Ingeniería de Sistemas o carrera afín\n- Conocimiento en JavaScript/TypeScript\n- Conocimiento en Node.js y Express\n- Conocimiento en bases de datos SQL\n- Git básico",
  "location": "Lima, Perú",
  "salary": "S/. 1,500",
  "workMode": "HYBRID",
  "contractType": "INTERNSHIP",
  "experienceLevel": "JUNIOR",
  "maxApplicants": 5
}
```

✅ **Resultado esperado:** 
- Status 201
- Mensaje: "Offer created successfully. Pending university approval."
- Objeto `offer` con `status: "PENDING_APPROVAL"`
📝 **Guardar:** `offerId`

---

#### 8.2. Listar Mis Ofertas
**GET** `http://localhost:3000/api/programs/companies/me/offers`

**Headers:**
```
Cookie: accessToken=<companyAccessToken>
```

✅ **Resultado esperado:** Array con la oferta creada

---

### FASE 9: ESTUDIANTE - INTENTAR APLICAR (debe fallar - oferta no aprobada)

#### 9.1. Ver Ofertas del Programa
**GET** `http://localhost:3000/api/programs/1/offers`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

✅ **Resultado esperado:** Array vacío (ofertas no aprobadas no se muestran)

---

### FASE 10: UNIVERSIDAD - APROBAR OFERTA

#### 10.1. Ver Ofertas del Programa (como universidad)
**GET** `http://localhost:3000/api/programs/1/offers`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

✅ **Resultado esperado:** Array con la oferta en PENDING_APPROVAL

---

#### 10.2. Aprobar Oferta
**PATCH** `http://localhost:3000/api/programs/1/offers/1/status`

**Headers:**
```
Cookie: accessToken=<universityAccessToken>
```

**Body:**
```json
{
  "status": "APPROVED"
}
```

✅ **Resultado esperado:** 
- Status 200
- Mensaje: "Offer status updated successfully"
- `status: "APPROVED"`, `approvedAt` y `approvedBy` rellenados

---

### FASE 11: ESTUDIANTE - APLICAR A OFERTA

#### 11.1. Ver Ofertas Aprobadas
**GET** `http://localhost:3000/api/programs/1/offers`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

✅ **Resultado esperado:** Array con la oferta aprobada

---

#### 11.2. Aplicar a la Oferta
**POST** `http://localhost:3000/api/programs/1/offers/1/apply`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

**Body:**
```json
{
  "coverLetter": "Estimados señores de TechCorp,\n\nMe dirijo a ustedes para expresar mi interés en la posición de Practicante de Desarrollo Backend. Soy estudiante del último año de Ingeniería de Sistemas en la UNMSM y tengo experiencia práctica con Node.js y TypeScript.\n\nDurante mis proyectos universitarios he desarrollado APIs REST, trabajado con bases de datos MySQL y aplicado buenas prácticas de desarrollo.\n\nEstoy muy motivado para aprender y contribuir al equipo.\n\nAtentamente,\nJuan Pérez",
  "resumeUrl": "https://example.com/juan-perez-cv-actualizado.pdf"
}
```

✅ **Resultado esperado:** 
- Status 201
- Mensaje: "Application submitted successfully"
- Objeto `application` con `status: "SUBMITTED"`

---

#### 11.3. Intentar Aplicar Nuevamente (debe fallar)
**POST** `http://localhost:3000/api/programs/1/offers/1/apply`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

❌ **Resultado esperado:** 
- Status 400
- Error: "You have already applied to this offer"

---

#### 11.4. Ver Mis Postulaciones
**GET** `http://localhost:3000/api/programs/students/me/applications`

**Headers:**
```
Cookie: accessToken=<studentAccessToken>
```

✅ **Resultado esperado:** 
- Array `applications` con 1 elemento
- Incluye datos de oferta, programa, universidad y empresa

---

### FASE 12: EMPRESA - VER POSTULACIONES

#### 12.1. Ver Postulaciones a Mi Oferta
**GET** `http://localhost:3000/api/programs/offers/1/applications`

**Headers:**
```
Cookie: accessToken=<companyAccessToken>
```

✅ **Resultado esperado:** 
- Array `applications` con 1 elemento
- Incluye datos completos del estudiante (perfil, CV, carta)
- Campo `coverLetter` visible

---

## ✅ CHECKLIST DE VALIDACIONES

### Códigos de Invitación:
- [ ] Solo universidades pueden crear códigos
- [ ] Código se genera automáticamente (16 caracteres hexadecimales)
- [ ] Se puede establecer `maxUses`
- [ ] Se puede establecer `expiresAt`
- [ ] Estudiante no puede canjear si ya pertenece a una universidad
- [ ] No se puede canjear código expirado
- [ ] No se puede canjear código que llegó a `maxUses`

### Programas:
- [ ] Solo universidades pueden crear programas
- [ ] `endDate` debe ser posterior a `startDate`
- [ ] Universidad puede listar solo sus programas
- [ ] Cualquier usuario autenticado puede ver detalles de un programa

### Interés de Empresa:
- [ ] Solo empresas pueden mostrar interés
- [ ] No se puede duplicar interés en el mismo programa
- [ ] Solo universidad del programa puede aprobar/rechazar
- [ ] Una vez revisado, no se puede cambiar status

### Ofertas en Programas:
- [ ] Solo empresas pueden crear ofertas
- [ ] Empresa debe estar aprobada en el programa
- [ ] Oferta inicia en `PENDING_APPROVAL`
- [ ] Solo universidad del programa puede aprobar/rechazar
- [ ] Ofertas no aprobadas no se muestran a estudiantes
- [ ] Empresa solo puede ver postulaciones de sus ofertas

### Postulaciones:
- [ ] Solo estudiantes pueden aplicar
- [ ] Estudiante debe pertenecer a la universidad del programa
- [ ] Estudiante debe tener membership `ACTIVE`
- [ ] Oferta debe estar `APPROVED`
- [ ] No se puede aplicar dos veces a la misma oferta
- [ ] No se puede aplicar si se alcanzó `maxApplicants`

---

## 🔍 CASOS EDGE A PROBAR

### 1. Código de Invitación Expirado
```json
{
  "expiresAt": "2020-01-01T00:00:00.000Z"
}
```
Intentar canjear → debe fallar

### 2. Código con Límite de Usos
```json
{
  "maxUses": 1
}
```
Canjear con 2 estudiantes diferentes → segundo debe fallar

### 3. Estudiante Sin Universidad Intenta Aplicar
Crear estudiante nuevo sin canjear código → intentar aplicar → debe fallar con "Student does not belong to any university"

### 4. Empresa No Aprobada Intenta Crear Oferta
Antes de aprobación → crear oferta → debe fallar

### 5. Programa con Fechas Inválidas
```json
{
  "startDate": "2025-12-31T00:00:00.000Z",
  "endDate": "2025-01-01T00:00:00.000Z"
}
```
Debe fallar con "End date must be after start date"

### 6. Límite de Postulantes
Crear oferta con `maxApplicants: 2` → registrar 3 estudiantes → los 3 intentan aplicar → tercero debe fallar

---

## 📈 ESCENARIO COMPLETO EXITOSO

Si todos los tests pasan, deberías tener:

1. ✅ 1 Universidad registrada (UNMSM)
2. ✅ 1 Empresa registrada (TechCorp)
3. ✅ 1 Estudiante registrado (Juan Pérez)
4. ✅ 1 Código de invitación activo
5. ✅ 1 Membership activo (estudiante → universidad)
6. ✅ 1 Programa de prácticas activo
7. ✅ 1 Empresa aprobada en el programa
8. ✅ 1 Oferta aprobada
9. ✅ 1 Postulación del estudiante

---

## 🔧 TROUBLESHOOTING

### Error: "Cannot find module '@prisma/client'"
```powershell
npx prisma generate
```

### Error: "Table doesn't exist"
```powershell
npx prisma migrate deploy
```

### Error: "accessToken cookie not found"
Verificar que estás enviando las cookies correctamente en los headers.

### Error 403: Forbidden
Verificar que estás usando el token del rol correcto para cada endpoint.

---

**TESTING FASE 3 COMPLETADO** ✅
