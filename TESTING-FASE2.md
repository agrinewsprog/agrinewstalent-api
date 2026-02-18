# FASE 2 - INSTRUCCIONES DE TESTING

## 🏗️ Módulos Implementados
- ✅ Módulo de Ofertas (JobOffer) - CRUD + Save/Unsave
- ✅ Módulo de Postulaciones (JobApplication) - Apply + Estados + Notas + Timeline

## 🚀 Pasos para Probar la API

### 1. Iniciar Base de Datos
```powershell
docker-compose up -d
```

### 2. Iniciar Servidor
```powershell
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

---

## 🧪 TESTING - FLUJO COMPLETO

### PASO 1: Registro de Usuarios

**1.1 Registrar Estudiante**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "juan.perez@estudiante.com",
  "password": "Password123!",
  "role": "STUDENT",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phoneNumber": "+51 987654321",
  "dateOfBirth": "2000-05-15",
  "careerField": "Ingeniería de Sistemas"
}
```

**1.2 Registrar Empresa**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "rrhh@techcorp.pe",
  "password": "Password123!",
  "role": "COMPANY",
  "companyName": "TechCorp SAC",
  "industry": "Tecnología",
  "foundedYear": 2015,
  "companySize": "50-200",
  "description": "Empresa líder en desarrollo de software",
  "website": "https://techcorp.pe"
}
```

---

### PASO 2: Login y Obtener Tokens

**2.1 Login como Empresa**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "rrhh@techcorp.pe",
  "password": "Password123!"
}
```

**Respuesta:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 2,
    "email": "rrhh@techcorp.pe",
    "role": "COMPANY",
    "status": "ACTIVE"
  }
}
```

> **Nota:** El `accessToken` y `refreshToken` se guardan automáticamente en cookies httpOnly.

**2.2 Login como Estudiante**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "juan.perez@estudiante.com",
  "password": "Password123!"
}
```

---

### PASO 3: Crear y Publicar Oferta (Como Empresa)

**3.1 Crear Oferta (DRAFT)**
```http
POST http://localhost:3000/api/offers
Content-Type: application/json
Cookie: accessToken=<TOKEN_EMPRESA>

{
  "title": "Desarrollador Backend Node.js",
  "description": "Buscamos desarrollador con experiencia en Node.js, TypeScript y bases de datos",
  "requirements": "- 2+ años de experiencia con Node.js\n- Conocimiento en Express y Prisma\n- Experiencia con MySQL o PostgreSQL\n- Dominio de TypeScript",
  "benefits": "- Trabajo 100% remoto\n- Horarios flexibles\n- Capacitaciones mensuales\n- Ambiente joven y dinámico",
  "location": "Lima, Perú (Remoto)",
  "salary": "S/. 4,000 - S/. 6,000",
  "workMode": "REMOTE",
  "contractType": "FULL_TIME",
  "experienceLevel": "SEMI_SENIOR"
}
```

**3.2 Publicar Oferta**
```http
POST http://localhost:3000/api/offers/1/publish
Cookie: accessToken=<TOKEN_EMPRESA>
```

---

### PASO 4: Ver Ofertas (Como Estudiante)

**4.1 Listar Ofertas Publicadas**
```http
GET http://localhost:3000/api/offers?status=PUBLISHED&workMode=REMOTE
```

**4.2 Ver Detalle de Oferta**
```http
GET http://localhost:3000/api/offers/1
```

**4.3 Guardar Oferta**
```http
POST http://localhost:3000/api/offers/1/save
Cookie: accessToken=<TOKEN_ESTUDIANTE>
```

**4.4 Ver Ofertas Guardadas**
```http
GET http://localhost:3000/api/offers/saved/me
Cookie: accessToken=<TOKEN_ESTUDIANTE>
```

---

### PASO 5: Postularse a Oferta (Como Estudiante)

**5.1 Aplicar a la Oferta**
```http
POST http://localhost:3000/api/applications/offers/1/apply
Content-Type: application/json
Cookie: accessToken=<TOKEN_ESTUDIANTE>

{
  "coverLetter": "Estimados de TechCorp SAC,\n\nMe interesa mucho esta posición de Desarrollador Backend porque tengo experiencia trabajando con Node.js, TypeScript y MySQL en proyectos universitarios. Me considero una persona proactiva que aprende rápido y me gustaría formar parte de su equipo.\n\nQuedo atento a su respuesta.\n\nSaludos,\nJuan Pérez",
  "resumeUrl": "https://storage.example.com/cv/juan-perez-cv.pdf"
}
```

**5.2 Ver Mis Postulaciones**
```http
GET http://localhost:3000/api/applications/students/me
Cookie: accessToken=<TOKEN_ESTUDIANTE>
```

**5.3 Ver Timeline de Postulación**
```http
GET http://localhost:3000/api/applications/1/timeline
Cookie: accessToken=<TOKEN_ESTUDIANTE>
```

---

### PASO 6: Gestionar Postulaciones (Como Empresa)

**6.1 Ver Postulaciones Recibidas**
```http
GET http://localhost:3000/api/applications/companies/me?status=SUBMITTED&offerId=1
Cookie: accessToken=<TOKEN_EMPRESA>
```

**6.2 Actualizar Estado a "Vista"**
```http
PATCH http://localhost:3000/api/applications/1/status
Content-Type: application/json
Cookie: accessToken=<TOKEN_EMPRESA>

{
  "status": "VIEWED"
}
```

**6.3 Agregar Nota Privada**
```http
POST http://localhost:3000/api/applications/1/notes
Content-Type: application/json
Cookie: accessToken=<TOKEN_EMPRESA>

{
  "note": "Candidato con buen perfil técnico. Revisar CV con más detalle antes de llamar a entrevista.",
  "isPrivate": true
}
```

**6.4 Solicitar Entrevista**
```http
PATCH http://localhost:3000/api/applications/1/status
Content-Type: application/json
Cookie: accessToken=<TOKEN_EMPRESA>

{
  "status": "INTERVIEW_REQUESTED"
}
```

**6.5 Ver Timeline de Postulación**
```http
GET http://localhost:3000/api/applications/1/timeline
Cookie: accessToken=<TOKEN_EMPRESA>
```

**6.6 Ver Notas de Postulación**
```http
GET http://localhost:3000/api/applications/1/notes
Cookie: accessToken=<TOKEN_EMPRESA>
```

**6.7 Agregar Nota Pública**
```http
POST http://localhost:3000/api/applications/1/notes
Content-Type: application/json
Cookie: accessToken=<TOKEN_EMPRESA>

{
  "note": "Entrevista agendada para el 25/02/2025 a las 10:00 AM",
  "isPrivate": false
}
```

**6.8 Contratar Candidato**
```http
PATCH http://localhost:3000/api/applications/1/status
Content-Type: application/json
Cookie: accessToken=<TOKEN_EMPRESA>

{
  "status": "HIRED"
}
```

---

## 🔐 Estados de Postulación

Los estados válidos son:
1. **SUBMITTED** - Postulación enviada
2. **VIEWED** - Vista por la empresa
3. **INTERVIEW_REQUESTED** - Entrevista solicitada
4. **HIRED** - Contratado
5. **REJECTED** - Rechazado

---

## ✅ Testing con REST Client (VS Code Extension)

Si tienes la extensión **REST Client** instalada en VS Code, crea un archivo `test.http`:

```http
### Variables
@baseUrl = http://localhost:3000/api
@studentEmail = juan.perez@estudiante.com
@companyEmail = rrhh@techcorp.pe
@password = Password123!

### 1. Register Student
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "{{studentEmail}}",
  "password": "{{password}}",
  "role": "STUDENT",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phoneNumber": "+51 987654321",
  "dateOfBirth": "2000-05-15",
  "careerField": "Ingeniería de Sistemas"
}

### 2. Register Company
POST {{baseUrl}}/auth/register
Content-Type: application/json

{
  "email": "{{companyEmail}}",
  "password": "{{password}}",
  "role": "COMPANY",
  "companyName": "TechCorp SAC",
  "industry": "Tecnología",
  "foundedYear": 2015,
  "companySize": "50-200",
  "description": "Empresa líder en desarrollo de software",
  "website": "https://techcorp.pe"
}

### 3. Login as Company
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "{{companyEmail}}",
  "password": "{{password}}"
}

### 4. Create Job Offer (use cookies from login)
POST {{baseUrl}}/offers
Content-Type: application/json

{
  "title": "Desarrollador Backend Node.js",
  "description": "Buscamos desarrollador con experiencia en Node.js y TypeScript",
  "requirements": "- 2+ años de experiencia\n- Node.js y TypeScript",
  "benefits": "- Remoto\n- Capacitaciones",
  "location": "Lima, Perú",
  "salary": "S/. 4,000 - S/. 6,000",
  "workMode": "REMOTE",
  "contractType": "FULL_TIME",
  "experienceLevel": "SEMI_SENIOR"
}

### 5. Publish Offer
POST {{baseUrl}}/offers/1/publish

### 6. Get Published Offers (no auth required)
GET {{baseUrl}}/offers?status=PUBLISHED

### 7. Login as Student
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "{{studentEmail}}",
  "password": "{{password}}"
}

### 8. Save Offer
POST {{baseUrl}}/offers/1/save

### 9. Apply to Offer
POST {{baseUrl}}/applications/offers/1/apply
Content-Type: application/json

{
  "coverLetter": "Me interesa mucho esta posición...",
  "resumeUrl": "https://example.com/cv.pdf"
}

### 10. Get Student Applications
GET {{baseUrl}}/applications/students/me

### 11. Get Application Timeline
GET {{baseUrl}}/applications/1/timeline

### 12. Login as Company again
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "{{companyEmail}}",
  "password": "{{password}}"
}

### 13. Get Company Applications
GET {{baseUrl}}/applications/companies/me

### 14. Update Application Status
PATCH {{baseUrl}}/applications/1/status
Content-Type: application/json

{
  "status": "VIEWED"
}

### 15. Add Note
POST {{baseUrl}}/applications/1/notes
Content-Type: application/json

{
  "note": "Buen perfil técnico",
  "isPrivate": true
}

### 16. Request Interview
PATCH {{baseUrl}}/applications/1/status
Content-Type: application/json

{
  "status": "INTERVIEW_REQUESTED"
}

### 17. Get Application Notes
GET {{baseUrl}}/applications/1/notes

### 18. Hire Candidate
PATCH {{baseUrl}}/applications/1/status
Content-Type: application/json

{
  "status": "HIRED"
}
```

---

## 🛠️ Comandos Útiles

```powershell
# Iniciar base de datos
docker-compose up -d

# Ver logs de la base de datos
docker-compose logs -f mysql

# Detener base de datos
docker-compose down

# Iniciar servidor en desarrollo
npm run dev

# Verificar schema de Prisma
npx prisma validate

# Ver base de datos con Prisma Studio
npx prisma studio
```

---

## 📊 Verificación con Prisma Studio

Puedes abrir Prisma Studio para ver los datos en tiempo real:

```powershell
npx prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde podrás ver:
- Usuarios registrados
- Perfiles de estudiantes y empresas
- Ofertas creadas
- Postulaciones
- Eventos de timeline
- Notas de la empresa

---

## ⚠️ Errores Comunes

### Error: "Cannot apply to unpublished offer"
- **Solución:** Asegúrate de publicar la oferta con `POST /offers/:id/publish` antes de postularte.

### Error: "You have already applied to this offer"
- **Solución:** Un estudiante solo puede postularse una vez a cada oferta.

### Error: "Unauthorized to update this application"
- **Solución:** Solo la empresa dueña de la oferta puede actualizar estados y agregar notas.

### Error: Cookie no se envía
- **Solución:** Asegúrate de que tu cliente HTTP envíe cookies automáticamente (fetch con `credentials: 'include'`, Postman con "Send cookies automatically").

---

**FASE 2 TESTING LISTO** ✅
